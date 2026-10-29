/* brain-data.js: everything the Brain Map page (/brain-map.html) says, in one place so it can be reviewed in one sitting.
   The page's drawing and behavior are in brain-art.js and brain-map.js. They read this file and add no claims of their own.

   RULES FOR EDITING THIS FILE
   - Every research claim is an average group difference, with a direction, an evidence label and at least one citation.
   - Evidence labels (B.evidence):  strong = replicated in large pooled studies;  moderate = pooled analyses or several consistent
     studies, but smaller, older or task-dependent;  early = a few small studies, a single data set, or mostly expert reviews.
   - Words: differences, tends to, on average. Never damage, defect, broken, abnormal, "chemical imbalance", or a cause.
   - "From the inside", "From the outside" and "What others can try" describe lived experience and common misreadings. They are not
     research findings about the brain, and the page says so.
   - The slider ranges (B.ranges) are a sketch drawn from the direction of the research. They are not measurements.
   - American English. No em dashes.
   Every citation is checked (tools/research/refs-m.json records how); B.citations has the plain-language finding for each.
   Nothing here is stored or sent. */
(function () {
  'use strict';
  var B = window.TOLBrain = {};
  B.updated = '2026-10-28';

  // ---------- how sure we are
  B.evidence = {
    strong: { label: 'Strong', dots: 3, note: 'Replicated in large pooled studies.' },
    moderate: { label: 'Moderate', dots: 2, note: 'Pooled analyses or several consistent studies, but smaller, older or dependent on the task.' },
    early: { label: 'Early', dots: 1, note: 'A few small studies, one data set, or mostly expert reviews.' }
  };

  // ---------- what each marker on the map means (the legend). Never color alone: each has its own shape and a word.
  B.glyphs = {
    up: { label: 'Tends to be more active', short: 'More active' },
    down: { label: 'Tends to be less active', short: 'Less active' },
    smaller: { label: 'Tends to be smaller or thinner', short: 'Smaller or thinner' },
    larger: { label: 'Tends to be larger or thicker', short: 'Larger or thicker' },
    linked: { label: 'Tends to be connected differently', short: 'Connected differently' },
    varies: { label: 'Tends to be more variable', short: 'More variable' }
  };
  B.glyphOrder = ['up', 'down', 'smaller', 'larger', 'linked', 'varies'];

  // ---------- the parts of the brain (positions are in brain-art.js)
  B.regions = [
    { id: 'pfc', name: 'Prefrontal cortex', short: 'Prefrontal', job: 'Planning, steering attention, weighing choices',
      plain: 'The front of the brain, behind your forehead. It helps you make a plan, keep it in mind, pick what to pay attention to, and pause an impulse long enough to think. It works best when you are rested and not flooded.' },
    { id: 'acc', name: 'Anterior cingulate cortex', short: 'Cingulate', job: 'Noticing conflict and errors',
      plain: 'A curved strip along the middle of the front brain. It helps notice when something does not match: a mistake, two goals pulling against each other, or a feeling that clashes with what you are doing.' },
    { id: 'insula', name: 'Insula', short: 'Insula', job: 'Body signals and feelings',
      plain: 'A folded patch of cortex tucked deep inside the side of the brain. It reads signals from inside the body, like heartbeat, hunger, gut feelings and pain, and helps turn them into feelings you can name.' },
    { id: 'amygdala', name: 'Amygdala', short: 'Amygdala', job: 'Alarm and what matters',
      plain: 'Two almond-sized clusters, one in each temporal lobe. They help flag what is important or possibly dangerous, fast, before you have thought it through. They flag good news too, not only threats.' },
    { id: 'hippocampus', name: 'Hippocampus', short: 'Hippocampus', job: 'Memory and context',
      plain: 'A curved structure next to each amygdala. It helps store new memories and tag them with where and when, which is part of how a place or a moment comes to feel safe or not safe.' },
    { id: 'striatum', name: 'Basal ganglia (striatum)', short: 'Striatum', job: 'Habits, reward, movement',
      plain: 'A set of deep clusters near the center. They help turn repeated actions into habits, weigh up rewards, and start or stop movement.' },
    { id: 'thalamus', name: 'Thalamus', short: 'Thalamus', job: 'Relay and filtering of the senses',
      plain: 'A small egg-shaped hub in the center. Nearly every sense, except smell, passes through it on the way to the cortex, and it helps set what gets through and how loud.' },
    { id: 'cerebellum', name: 'Cerebellum', short: 'Cerebellum', job: 'Timing, coordination, smoothing',
      plain: 'The finely folded structure at the back and bottom. It smooths movement and timing, and it also helps with learned sequences and the rhythm of speech and thought.' },
    { id: 'senses', name: 'Sensory cortices', short: 'Senses', job: 'Sights, sounds, touch',
      plain: 'Strips of cortex that receive and first sort what the eyes, ears and skin report: vision at the back, hearing along the side, touch on a band across the top.' },
    { id: 'tpj', name: 'Temporal-parietal areas', short: 'Temporal-parietal', job: 'Language, reading, reading other people’s signals',
      plain: 'Where the side and the back of the brain meet. These areas help link written and spoken words with meaning, and help read other people’s voices, faces and intentions.' }
  ];

  // ---------- networks: groups of regions that work together
  B.networks = [
    { id: 'default', name: 'Default mode network', short: 'Default mode', job: 'Mind-wandering, memory, thinking about people',
      plain: 'Regions that tend to be busy when you are not focused on a task: daydreaming, remembering, imagining, thinking about yourself and other people. It usually quiets down when you concentrate.', nodes: ['pfc', 'hippocampus', 'tpj'] },
    { id: 'salience', name: 'Salience network', short: 'Salience', job: 'Flagging what matters right now',
      plain: 'Anchored in the insula and the anterior cingulate and linked with the amygdala. It helps notice what stands out, inside or outside, and helps switch between daydreaming and focus.', nodes: ['insula', 'acc', 'amygdala'] },
    { id: 'control', name: 'Frontoparietal control network', short: 'Control', job: 'Keeping a goal in mind and steering',
      plain: 'Front and side-back regions that work together when you plan, switch tasks, resist a distraction or work something out. It is what people usually mean by “executive function.”', nodes: ['pfc', 'tpj'] },
    { id: 'habit', name: 'Habit loop (cortex, striatum, thalamus)', short: 'Habit loop', job: 'Turning repeated actions into habits',
      plain: 'A loop that runs from the front of the brain through the striatum and the thalamus and back again. It helps turn repeated actions into habits, and helps stop one action and start another.', nodes: ['pfc', 'striatum', 'thalamus'] },
    { id: 'reading', name: 'Reading network', short: 'Reading', job: 'Linking letters to sounds and meaning',
      plain: 'Areas on the left side that link what the eyes see to the sounds and meanings of words: the lower back (where letter shapes are recognized), the area behind the ear, and the front left.', nodes: ['senses', 'tpj', 'pfc'] }
  ];

  // ---------- the profiles. Order is the order of the chips.
  // effects: r = a region id (or 'whole' for the whole brain or body), n = a network id, d = a glyph (or null for a plain note),
  //          ev = evidence, t = the plain-words claim, c = citations (ids in B.citations)
  B.profiles = [
    {
      id: 'autism', name: 'Autistic wiring', chip: 'Autistic wiring', color: '#2B5B8C',
      kind: 'A neurodevelopmental difference', kindNote: 'A lifelong way of taking in the world and other people.',
      summary: 'Autistic people tend to take in the senses, other people’s signals and routines in their own way. Scan studies find small average differences in several regions, and autistic people vary a great deal from each other.',
      effects: [
        { r: 'senses', d: 'varies', ev: 'strong', c: ['benSasson-2009-sensory-asd', 'robertson-baroncohen-2017-sensory'],
          t: 'Sensory differences are very common, and they run in both directions: some sensations arrive too loud, others barely register. In a pooled analysis the gap was biggest for under-responding, then over-responding. This comes from reports and behavior tests, not from a scan.' },
        { r: 'thalamus', d: 'linked', ev: 'early', c: ['woodward-2017-thalamus-asd'],
          t: 'The thalamus, the relay for the senses, was more strongly connected with several cortical areas in one data set (228 autistic and 228 non-autistic people), mostly in teenagers. Other studies found weaker links in some pathways, so the direction is not settled.' },
        { r: 'tpj', d: 'smaller', ev: 'strong', c: ['vanrooij-2018-enigma-asd'],
          t: 'The temporal cortex was slightly thinner on average, with the biggest gap around adolescence. The effect was about two tenths of a standard deviation at most.' },
        { r: 'pfc', d: 'larger', ev: 'strong', c: ['vanrooij-2018-enigma-asd'],
          t: 'Parts of the frontal cortex were slightly thicker on average, again about two tenths of a standard deviation at most. The pattern changes with age.' },
        { r: 'striatum', d: 'smaller', ev: 'strong', c: ['vanrooij-2018-enigma-asd'],
          t: 'The putamen, the nucleus accumbens and the pallidum, which sit in or beside the striatum, were slightly smaller on average, by about a tenth of a standard deviation.' },
        { r: 'amygdala', d: 'smaller', ev: 'strong', c: ['vanrooij-2018-enigma-asd'],
          t: 'Slightly smaller on average, by about a tenth of a standard deviation. Size is not the same as how a region responds.' },
        { r: 'cerebellum', d: 'smaller', ev: 'early', c: ['stoodley-2014-cerebellum'],
          t: 'In a pooled analysis of 17 small scan studies, a few parts of the cerebellum had slightly less gray matter. The cerebellum is a newer area of autism research.' },
        { r: 'whole', d: 'linked', ev: 'moderate', c: ['hull-2016-rsfc-asd', 'holiga-2019-asd-connectivity'],
          t: 'Across the brain, studies report some links as stronger and some as weaker, and which it is depends on age and on the study. A multi-site analysis found a repeatable pattern, but autistic and non-autistic groups overlapped a lot, and the authors say it cannot be used to diagnose.' }
      ],
      size: { lo: 0.1, hi: 0.2, c: ['vanrooij-2018-enigma-asd'] },
      inside: [
        { s: 'A noisy store', t: 'The freezer hum, the music, a squeaky cart and three conversations all arrive at the same volume. By aisle four you are spending most of your energy just staying put. Or the reverse: some sounds and touches barely register, and you notice you are very hungry or cold only when it is large.' },
        { s: 'A hard text', t: '“Fine.” could mean five things, and there is no tone of voice to check. You may read it ten times, or answer with exactly what you mean and not understand why it landed badly.' },
        { s: 'A long to-do list', t: 'Starting is the hard part, especially when you have to switch away from something you were absorbed in. Once you are in, hours can vanish. An interruption feels like losing your place in a book you were inside.' },
        { s: 'Waking at 3 a.m.', t: 'The day’s conversations replay, and you check each sentence for what you might have gotten wrong. After a day of working to read faces and guess rules, you may need hours alone to feel like yourself again.' }
      ],
      outside: [
        { t: 'Looking away, or a flat voice, can read as cold or bored. Often the person is listening harder than it looks. In studies, people formed a worse first impression from a few seconds of video, and the effect vanished when they read a transcript.', c: ['sasson-2017'] },
        { t: 'Leaving a party early, or going quiet, can look rude. It is often an empty battery after hours of effort to fit in.', c: ['hull-2017', 'raymaker-2020'] },
        { t: 'Misunderstanding runs both ways. In one experiment, autistic people passed a story along as well as non-autistic people did, and mixed chains lost more detail.', c: ['crompton-2020', 'milton-2012'] }
      ],
      helps: [
        { t: 'Turn the load down: a quieter corner, headphones, dimmer lights, fewer surprises.', ev: 'early', c: ['pfeiffer-2019-headphones'] },
        { t: 'Say what is coming: plans in writing, changes announced early. Not knowing what happens next is strongly tied to anxiety in autistic people, which is why many find this helps. That link is solid, but the help itself has not been tested much.', ev: 'early', c: ['jenkinson-2020-iu'] },
        { t: 'Plan recovery time after social effort, and treat it as needed, not as rude.', ev: 'early', c: ['raymaker-2020', 'hull-2017'] },
        { t: 'Time with other autistic people, where communication tends to go smoothly.', ev: 'moderate', c: ['crompton-2020'] },
        { t: 'Support for anxiety and low mood when they show up, since both are common. About one in four autistic adults had an anxiety disorder at the time of study in one pooled analysis.', ev: 'moderate', c: ['hollocks-2019-autism-anxiety'] }
      ],
      others: [
        { k: 'Say', t: 'Say what you mean, not what you hint. “Can you take the trash out before 6?” lands better than “This place is a mess.”' },
        { k: 'Do', t: 'Give notice before a change, and offer a quiet minute without asking why.' },
        { k: 'Say', t: '“What would make this easier?” Then believe the answer, even when it is not what you would pick.' }
      ]
    },
    {
      id: 'adhd', name: 'ADHD wiring', chip: 'ADHD wiring', color: '#B5651D',
      kind: 'A neurodevelopmental difference', kindNote: 'A difference in how attention, effort and reward get steered, often lasting into adult life.',
      summary: 'ADHD is often described as attention that is hard to aim and easy to lock on to, more than a plain shortage of it. Scan studies find small average differences in several deep regions, mostly seen in children, and in the networks that steer attention.',
      effects: [
        { r: 'striatum', d: 'smaller', ev: 'strong', c: ['hoogman-2017-adhd-subcortical'],
          t: 'The nucleus accumbens, caudate and putamen were slightly smaller on average, by about 0.1 to 0.15 of a standard deviation, in 1,713 people with ADHD and 1,529 without (ages 4 to 63, median 14). The gap was clearest in children and was smaller in adults, so this is not a finding about every age.' },
        { r: 'amygdala', d: 'smaller', ev: 'strong', c: ['hoogman-2017-adhd-subcortical'],
          t: 'Slightly smaller on average, by about 0.2 of a standard deviation, the largest of the deep-region differences in that study, again mainly in children.' },
        { r: 'hippocampus', d: 'smaller', ev: 'strong', c: ['hoogman-2017-adhd-subcortical'],
          t: 'Slightly smaller on average, by about a tenth of a standard deviation, mainly in children.' },
        { r: 'amygdala', d: 'linked', ev: 'early', c: ['shaw-2014-emotion-dysregulation-adhd'],
          t: 'Feelings that rise fast and are hard to bring back down are common in ADHD. Researchers propose a network linking the striatum, the amygdala and the middle of the prefrontal cortex.' },
        { r: 'pfc', d: 'down', ev: 'moderate', c: ['cortese-2012-adhd-fmri'],
          t: 'During attention and control tasks, front-of-brain regions in the control network were on average less active. Across 55 studies the pattern held even in people with no other condition and no history of stimulant use.' },
        { r: 'senses', d: 'up', ev: 'moderate', c: ['cortese-2012-adhd-fmri'],
          t: 'Areas for movement were on average more active during tasks in children, and areas for seeing in adults.' },
        { r: 'cerebellum', d: 'smaller', ev: 'early', c: ['stoodley-2014-cerebellum'],
          t: 'A small part of the cerebellum had slightly less gray matter in a pooled analysis of 10 scan studies.' },
        { n: 'control', d: 'down', ev: 'moderate', c: ['cortese-2012-adhd-fmri'],
          t: 'The frontoparietal control network was on average less active in tasks that need steering.' },
        { n: 'default', d: 'up', ev: 'moderate', c: ['cortese-2012-adhd-fmri'],
          t: 'The default mode network was on average more active during tasks, when it usually quiets down.' },
        { r: 'whole', d: null, ev: 'strong', c: ['hoogman-2019-adhd-cortex'],
          t: 'In children, the cortex shows small average differences in surface area and thickness. The same study found no such differences in adolescents or adults. In a population sample of children, cortex measures also related, more weakly, to attention problems, which fits ADHD being the far end of a continuum.' }
      ],
      size: { lo: 0.1, hi: 0.2, c: ['hoogman-2017-adhd-subcortical'] },
      inside: [
        { s: 'A noisy store', t: 'Everything pulls at once: the colors, the music, a kid, the next aisle. Your list leaves your head by the second shelf, and you leave with four things you did not come for.' },
        { s: 'A hard text', t: 'You read it, meant to answer, and three days later realize you never did. Or you answer fast, hit send, and wish you hadn’t.' },
        { s: 'A long to-do list', t: 'You can see every item. Starting does not happen until the deadline is close or something sparks your interest. Then you work for six hours and forget to eat.' },
        { s: 'Waking at 3 a.m.', t: 'Your mind finally gets quiet enough to think at 1 a.m., which is also when you needed to be asleep. By 3 you are awake again, planning tomorrow in detail.' }
      ],
      outside: [
        { t: 'Late, forgetful, or “not trying,” even when the person is trying very hard. Effort looks uneven because interest, not importance, switches it on.' },
        { t: 'Interrupting or blurting can read as not caring. It is often excitement racing the thought out before it fades.' },
        { t: 'Strong feelings that rise fast and settle fast get read as drama or a bad temper.', c: ['shaw-2014-emotion-dysregulation-adhd'] }
      ],
      helps: [
        { t: 'Medicine eases core symptoms for many people in the short term. Some choose it and some do not. Long-term evidence is thinner.', ev: 'strong', c: ['cortese-2018-adhd-medications'] },
        { t: 'Exercise, especially aerobic exercise, helped attention and hyperactivity in small trials with children.', ev: 'moderate', c: ['cerrillo-urbina-2015-exercise-adhd'] },
        { t: 'Put the task where you can see it: sticky notes, timers, a visible checklist, a first step that takes two minutes.', ev: 'early', c: [] },
        { t: 'Work alongside someone, in the same room or on a call, even when you are doing different things.', ev: 'early', c: [] },
        { t: 'Expect big feelings that pass fast, and agree on a pause line ahead of time.', ev: 'early', c: ['shaw-2014-emotion-dysregulation-adhd'] }
      ],
      others: [
        { k: 'Say', t: '“I’m not mad. Want to do this together right now?”' },
        { k: 'Do', t: 'Ask for one thing at a time, in writing, with a time. A reminder is a kindness, not a sign of failure.' },
        { k: 'Say', t: '“I know you meant to. What would help it get done?”' }
      ]
    },
    {
      id: 'anxiety', name: 'Anxiety', chip: 'Anxiety', color: '#8A4F9E',
      kind: 'A health condition that can improve', kindNote: 'The body’s alarm runs high and often. Treatment works for many people.',
      summary: 'In anxiety, the body’s alarm tends to go off quickly and settle slowly. In social anxiety, phobias and PTSD, brain studies find that the alarm and body-signal regions react more strongly to threat on average. Generalized anxiety and panic are less well covered, and a small study found these regions change with treatment.',
      effects: [
        { r: 'amygdala', d: 'up', ev: 'moderate', c: ['etkin-wager-2007-anxiety', 'shin-liberzon-2010-fear-circuits'],
          t: 'More active than in comparison groups when people with social anxiety, a phobia or PTSD handle feared or emotional material. This is a reaction to cues, not constant activity.' },
        { r: 'insula', d: 'up', ev: 'moderate', c: ['etkin-wager-2007-anxiety', 'shin-liberzon-2010-fear-circuits'],
          t: 'More active in the same studies. The insula reads the body (a racing heart, a tight stomach) and helps turn it into a feeling.' },
        { r: 'pfc', d: 'varies', ev: 'early', c: ['shin-liberzon-2010-fear-circuits'],
          t: 'The front-of-brain areas that help settle the alarm show mixed results across anxiety conditions, so this one is marked early.' },
        { n: 'salience', d: 'up', ev: 'moderate', c: ['etkin-wager-2007-anxiety', 'menon-2011-triple-network'],
          t: 'The salience network, which pulls together the insula, the cingulate and the amygdala, is described as more reactive in anxiety, so more things get flagged as mattering.' }
      ],
      size: null,
      inside: [
        { s: 'A noisy store', t: 'Your heart climbs and you scan for the exit and for who is looking at you. A dropped box makes you jump, and you feel it in your chest for ten minutes.' },
        { s: 'A hard text', t: 'You write five versions, picture three ways it goes wrong, and are still checking the screen an hour after you hit send.' },
        { s: 'A long to-do list', t: 'Each item comes with a “what if” attached. The list is not that long. The worrying is.' },
        { s: 'Waking at 3 a.m.', t: 'The worries are lined up and ready before you are awake. Your body is in a hurry while you lie still.' }
      ],
      outside: [
        { t: 'Needing reassurance can look like needing attention. Canceling plans can look like flaking.' },
        { t: 'Avoiding things can look like laziness or stubbornness. The person is often working hard to avoid a feeling, not a task.' },
        { t: 'Many people look calm while paying a high price for it, so the people around them do not see it.' }
      ],
      helps: [
        { t: 'Cognitive behavioral therapy has the strongest support for anxiety problems, across many reviews.', ev: 'strong', c: ['hofmann-2012-cbt', 'nice-cg113-anxiety-panic', 'nice-cg159-social-anxiety'] },
        { t: 'Facing a feared thing in small steps, until your body learns it was safe enough, is a core part of that treatment.', ev: 'moderate', c: ['craske-2014-exposure'] },
        { t: 'Regular movement lowers symptoms of anxiety, with medium-sized effects across many trials.', ev: 'strong', c: ['singh-2023'] },
        { t: 'Put the feeling into words. Naming it lowered the alarm response in a lab task.', ev: 'moderate', c: ['lieberman-2007'] },
        { t: 'Sleep. After a night without it, the amygdala reacted more strongly in one small study.', ev: 'moderate', c: ['yoo-walker-2007'] },
        { t: 'The brain changes with treatment. After nine weeks of internet-delivered therapy, the amygdala’s response and size both fell in a small trial.', ev: 'early', c: ['mansson-2016-cbt-plasticity'] }
      ],
      others: [
        { k: 'Say', t: '“I’m here, no rush. What would help right now?” Skip “calm down.”' },
        { k: 'Do', t: 'Offer company instead of answers to the same worry again and again.' },
        { k: 'Do', t: 'Give a heads-up on plans, and make an easy way out that you will not take personally.' }
      ]
    },
    {
      id: 'depression', name: 'Depression', chip: 'Depression', color: '#3E6B4C',
      kind: 'A health condition that can improve', kindNote: 'Mood, energy and interest drop for weeks or longer. Support and treatment help many people.',
      summary: 'Depression changes mood, energy and interest, often for weeks or longer. Brain studies find small average differences in memory, mood and reward regions, clearer in people who have had repeated episodes.',
      effects: [
        { r: 'hippocampus', d: 'smaller', ev: 'strong', c: ['schmaal-2016-subcortical-mdd'],
          t: 'Slightly smaller on average, by about 1 percent, in 1,728 people with depression and 7,199 without. The gap was clearest in people with repeated episodes or an early start, and not seen in a first episode.' },
        { r: 'pfc', d: 'smaller', ev: 'strong', c: ['schmaal-2017-cortical-mdd'],
          t: 'The orbitofrontal cortex, at the front above the eyes, was slightly thinner on average in adults, by about a tenth of a standard deviation.' },
        { r: 'acc', d: 'smaller', ev: 'strong', c: ['schmaal-2017-cortical-mdd'],
          t: 'The anterior cingulate was slightly thinner on average in adults, by about a tenth of a standard deviation.' },
        { r: 'insula', d: 'smaller', ev: 'strong', c: ['schmaal-2017-cortical-mdd'],
          t: 'The insula was slightly thinner on average in adults, by about a tenth of a standard deviation.' },
        { r: 'amygdala', d: 'up', ev: 'moderate', c: ['hamilton-2012-depression-fmri'],
          t: 'More active on average when handling negative material, in pooled studies.' },
        { r: 'insula', d: 'up', ev: 'moderate', c: ['hamilton-2012-depression-fmri'],
          t: 'More active on average with negative material, in the same studies.' },
        { r: 'acc', d: 'up', ev: 'moderate', c: ['hamilton-2012-depression-fmri'],
          t: 'The dorsal part was more active on average with negative material.' },
        { r: 'pfc', d: 'down', ev: 'moderate', c: ['hamilton-2012-depression-fmri'],
          t: 'The dorsolateral prefrontal cortex was less active on average in the same studies.' },
        { r: 'striatum', d: 'down', ev: 'moderate', c: ['hamilton-2012-depression-fmri'],
          t: 'The dorsal striatum was less active on average in the same studies. It is part of the reward and motivation circuitry.' },
        { n: 'control', d: 'linked', ev: 'moderate', c: ['kaiser-2015-depression-networks'],
          t: 'Less connectivity inside the frontoparietal control network, and between it and the network that points attention outward. The differences are modest and the groups overlap.' }
      ],
      size: { lo: 0.1, hi: 0.15, c: ['schmaal-2016-subcortical-mdd', 'schmaal-2017-cortical-mdd'] },
      inside: [
        { s: 'A noisy store', t: 'Nothing scares you. Everything is flat and far away, and two minutes of noise wears you out.' },
        { s: 'A hard text', t: 'A short reply reads like proof you are a burden. Even a warm message does not land the way it should.' },
        { s: 'A long to-do list', t: 'The list is not long. Your body will not start. Brushing your teeth counts as an item, and the things that used to be fun have stopped pulling at you.' },
        { s: 'Waking at 3 a.m.', t: 'Awake with a loop of what is wrong with you. Or asleep for ten hours and not rested.' }
      ],
      outside: [
        { t: 'Looks like laziness, moodiness or not trying. Someone can seem fine at work and fall apart at home.' },
        { t: 'Canceling plans and going quiet can look like rejecting the people who care. It is usually the opposite: no energy to show it.' },
        { t: 'Some people joke their way through it, which hides how heavy it is.' }
      ],
      helps: [
        { t: 'Talking therapies, including cognitive behavioral therapy, and antidepressants, chosen together with a clinician, are the standard options.', ev: 'strong', c: ['nice-2022-depression'] },
        { t: 'Behavioral activation: plan small things that matter to you and do them, before the energy shows up.', ev: 'moderate', c: ['ekers-2014-ba'] },
        { t: 'Regular movement lowers symptoms of depression, with medium-sized effects across many trials.', ev: 'strong', c: ['singh-2023'] },
        { t: 'Mindfulness-based cognitive therapy cut the chance of relapse for people with repeated episodes.', ev: 'strong', c: ['kuyken-2016-mbct'] },
        { t: 'Staying in touch with groups and people. Among people already depressed, joining a group was linked to lower risk of relapse.', ev: 'moderate', c: ['cruwys-2013-groups'] }
      ],
      others: [
        { k: 'Say', t: '“You don’t have to explain. I’d like to sit with you.” Skip “cheer up.”' },
        { k: 'Do', t: 'Offer one small, specific thing: “I’m walking at 5. I’ll text when I’m outside.”' },
        { k: 'Do', t: 'Keep inviting, lightly, and do not keep score if the answer is no.' }
      ]
    },
    {
      id: 'trauma', name: 'Trauma and PTSD', chip: 'Trauma and PTSD', color: '#96412B',
      kind: 'A health condition that can improve', kindNote: 'Can follow overwhelming events. Many people go through trauma and a minority develop PTSD.',
      summary: 'After overwhelming events, the body’s alarm can stay switched on, and the past can feel present. Some of the studies here compare people with PTSD to people who also went through trauma but did not develop it, which is the fairest comparison. Others compare with people who were not exposed, so the comparison group differs from line to line.',
      effects: [
        { r: 'hippocampus', d: 'smaller', ev: 'strong', c: ['logue-2018-hippocampus-ptsd'],
          t: 'Slightly smaller on average, by about 0.17 of a standard deviation, in 1,868 people, compared with people who also lived through trauma but did not develop PTSD. A scan cannot show whether it was that way before.' },
        { r: 'amygdala', d: 'up', ev: 'moderate', c: ['etkin-wager-2007-anxiety', 'hayes-2012-ptsd-meta'],
          t: 'More active on average to trauma reminders and emotional material. Its size, by contrast, was not clearly different once the many regions tested were accounted for.' },
        { r: 'insula', d: 'up', ev: 'moderate', c: ['etkin-wager-2007-anxiety', 'shin-liberzon-2010-fear-circuits'],
          t: 'More active on average in the same studies.' },
        { r: 'pfc', d: 'down', ev: 'moderate', c: ['etkin-wager-2007-anxiety', 'hayes-2012-ptsd-meta'],
          t: 'The ventromedial prefrontal cortex, which helps settle the alarm, was less active on average.' },
        { r: 'acc', d: 'varies', ev: 'early', c: ['etkin-wager-2007-anxiety', 'hayes-2012-ptsd-meta'],
          t: 'Results differ by study and by part: some pooled studies find parts of the cingulate more active, others less.' },
        { n: 'salience', d: 'up', ev: 'moderate', c: ['etkin-wager-2007-anxiety', 'shin-liberzon-2010-fear-circuits'],
          t: 'The salience network, which pulls together the insula, the cingulate and the amygdala, tends to react more to reminders of the trauma.' },
        { r: 'whole', d: null, ev: 'moderate', c: ['pole-2007-ptsd-physiology'],
          t: 'Beyond the brain, the heart beat faster on average at rest, during startle tests and when reminded of the trauma, in a pooled analysis of studies mostly of male veterans.' }
      ],
      size: { lo: 0.1, hi: 0.17, c: ['logue-2018-hippocampus-ptsd'], vs: 'people who went through trauma but did not develop PTSD' },
      inside: [
        { s: 'A noisy store', t: 'A loud bang, a hand on your shoulder from behind, a smell: your body is in the old moment before your mind can say, “It’s now, and I’m okay.”' },
        { s: 'A hard text', t: 'Short or sharp words can set off the same flood as the old situation, and you go from fine to shaking in seconds.' },
        { s: 'A long to-do list', t: 'Hard to start when your body is on guard. You scan the room, you cannot rest, and concentration is thin.' },
        { s: 'Waking at 3 a.m.', t: 'Awake with your heart racing, checking the doors. You may be afraid to go back to sleep.' }
      ],
      outside: [
        { t: 'Looks jumpy, irritable or withdrawn. Or flat and numb. Reactions can seem out of proportion to the moment because they belong to an earlier one.' },
        { t: 'Avoiding places, people or topics can look like being difficult. It is usually protection.' },
        { t: 'Many people with PTSD function well on the outside while the inside is exhausting.' }
      ],
      helps: [
        { t: 'Trauma-focused cognitive behavioral therapy, and EMDR for adults more than three months after a non-combat trauma, are the recommended treatments.', ev: 'strong', c: ['nice-ng116-ptsd'] },
        { t: 'Predictable routines, a say in what happens next, and warning before touch or sudden changes.', ev: 'early', c: [] },
        { t: 'Grounding with the senses: name five things you can see, feel your feet on the floor.', ev: 'early', c: [] },
        { t: 'Treating insomnia. In a large trial of students, better sleep improved other mental health symptoms too. It was not a trauma study, so this one is a reasonable bet, not a proven one.', ev: 'early', c: ['freeman-2017-oasis'] }
      ],
      others: [
        { k: 'Say', t: '“You’re safe right now. I’m here.” Skip “just relax.”' },
        { k: 'Do', t: 'Warn before touching, before sudden noise and before changes of plan. Let them sit where they can see the door.' },
        { k: 'Do', t: 'Never push for details. Let them choose when and how much to tell.' }
      ]
    },
    {
      id: 'ocd', name: 'OCD', chip: 'OCD', color: '#7A5620',
      kind: 'A health condition that can improve', kindNote: 'Unwanted sticky thoughts and the actions done to ease them. Treatment works for many people.',
      summary: 'OCD pairs unwanted, sticky thoughts (obsessions) with actions or mental rituals (compulsions) done to ease the distress. Studies point to loops that link the front of the brain with deep habit regions and the thalamus.',
      effects: [
        { r: 'striatum', d: 'larger', ev: 'strong', c: ['boedhoe-2017-ocd-subcortical'],
          t: 'The pallidum, part of the basal ganglia, was slightly larger on average in adults (about 0.16 of a standard deviation), more so in people taking medicine.' },
        { r: 'hippocampus', d: 'smaller', ev: 'strong', c: ['boedhoe-2017-ocd-subcortical'],
          t: 'Slightly smaller on average in adults, by about 0.13 of a standard deviation.' },
        { r: 'thalamus', d: 'larger', ev: 'strong', c: ['boedhoe-2017-ocd-subcortical'],
          t: 'In children who were not taking medicine, the thalamus was larger on average (about 0.38 of a standard deviation, the largest effect in this set). Not seen in adults.' },
        { r: 'tpj', d: 'smaller', ev: 'strong', c: ['boedhoe-2018-ocd-cortical'],
          t: 'The inferior parietal cortex was slightly thinner on average, in both adults and children (effects of about 0.1 to 0.3 of a standard deviation).' },
        { n: 'habit', d: 'linked', ev: 'moderate', c: ['milad-rauch-2012-ocd-circuits', 'menzies-2008-ocd-model'],
          t: 'Loops linking the front of the brain, the striatum and the thalamus work differently on average. Reviews say the circuit picture is wider than one loop.' },
        { r: 'acc', d: 'linked', ev: 'early', c: ['milad-rauch-2012-ocd-circuits'],
          t: 'The dorsal cingulate and the orbitofrontal cortex are implicated in reviews, but the direction depends on the study and the task.' },
        { r: 'amygdala', d: 'linked', ev: 'early', c: ['milad-rauch-2012-ocd-circuits'],
          t: 'Circuits through the amygdala may matter too, including learning that a fear is no longer needed (called extinction).' }
      ],
      size: { lo: 0.1, hi: 0.3, c: ['boedhoe-2017-ocd-subcortical', 'boedhoe-2018-ocd-cortical'] },
      inside: [
        { s: 'A noisy store', t: 'A cart handle sets off “contaminated.” Or “did I lock the car?” pulls you back across the lot, twice.' },
        { s: 'A hard text', t: 'A thought that you may have hurt someone replays. You need to reread, check, or confess to feel sure, and the sure feeling does not last.' },
        { s: 'A long to-do list', t: 'Each task has to be done “just right” or in an exact order. A four-minute job takes forty.' },
        { s: 'Waking at 3 a.m.', t: 'A thought you hate walks in and will not leave. Arguing with it feeds it.' }
      ],
      outside: [
        { t: 'Looks like perfectionism, quirks or being controlling. Shame hides it, so people often do not know.' },
        { t: 'Asking for reassurance again and again can look like needing attention.' },
        { t: 'Long bathroom trips or being late can look like carelessness. The person may be fighting a ritual.' }
      ],
      helps: [
        { t: 'Cognitive behavioral therapy built on exposure and response prevention: facing the trigger and not doing the ritual. It cut symptoms a lot across 16 randomized trials.', ev: 'strong', c: ['olatunji-2013-ocd-cbt'] },
        { t: 'Name it: “That’s the OCD talking.” Treat the thought as noise, not as news.', ev: 'early', c: [] },
        { t: 'Family and friends: agree a plan to ease back on reassurance and on joining rituals, together, step by step.', ev: 'early', c: [] }
      ],
      others: [
        { k: 'Say', t: '“That sounds like the OCD talking. I’m here with you. Want to sit with it together for ten minutes?”' },
        { k: 'Do', t: 'Do not join or take over rituals without agreeing a plan together first.' },
        { k: 'Say', t: 'Skip “that’s so quirky.” Ask, “What makes this week easier?”' }
      ]
    },
    {
      id: 'dyslexia', name: 'Dyslexia', chip: 'Dyslexia', color: '#2F7F8F',
      kind: 'A neurodevelopmental difference', kindNote: 'Reading and spelling come harder. It says nothing about intelligence or effort.',
      summary: 'Dyslexia often comes from difficulty linking the sounds of speech to written letters. Brain studies find that the left-side reading network is on average less active during reading, and that good teaching changes both reading and the brain’s response.',
      effects: [
        { r: 'tpj', d: 'down', ev: 'moderate', c: ['richlan-2009-dyslexia-meta', 'gabrieli-2009-dyslexia'],
          t: 'During reading tasks, the left temporal-parietal areas and the lower back of the left side, where letter shapes are recognized, were on average less active, across 17 studies. This fits the difficulty linking letters to sounds.' },
        { r: 'pfc', d: 'down', ev: 'moderate', c: ['richlan-2009-dyslexia-meta'],
          t: 'The left inferior frontal gyrus, at the front left and linked to speech sounds, was less active on average in the same pooled studies.' },
        { r: 'insula', d: 'up', ev: 'moderate', c: ['richlan-2009-dyslexia-meta'],
          t: 'The anterior insula and the motor cortex were more active on average, which may be a way of working around the difficulty.' },
        { r: 'cerebellum', d: 'smaller', ev: 'early', c: ['stoodley-2014-cerebellum'],
          t: 'A small part of the left cerebellum had slightly less gray matter in a pooled analysis of 10 scan studies.' },
        { n: 'reading', d: 'down', ev: 'moderate', c: ['richlan-2009-dyslexia-meta', 'gabrieli-2009-dyslexia'],
          t: 'The reading network as a whole tends to be less active during reading.' }
      ],
      size: null,
      inside: [
        { s: 'A noisy store', t: 'Reading every sign costs effort, so you shop by shape, color and memory, and you ask a clerk rather than decode the aisle label.' },
        { s: 'A hard text', t: 'You read it twice to be sure. Your reply is short on purpose, so you do not have to spell much. Voice notes feel easier.' },
        { s: 'A long to-do list', t: 'A written list is slow to take in, and an unfamiliar form or a long email becomes a wall. The same list read aloud is easy.' },
        { s: 'Waking at 3 a.m.', t: 'Replaying the meeting where you were asked to read aloud, and dreading the next one.' }
      ],
      outside: [
        { t: 'Looks like not trying, being careless, or being less bright. Spelling mistakes get taken as lack of care.' },
        { t: 'Quick, creative talkers who struggle on paper get told they are lazy.' },
        { t: 'Avoiding reading aloud or forms can look like stubbornness. It is protecting dignity.' }
      ],
      helps: [
        { t: 'Structured, phonics-based teaching, which builds explicit links between sounds and letters, was the one approach with a clearly confirmed benefit in 22 randomized trials.', ev: 'moderate', c: ['galuschka-2014-reading-treatments'] },
        { t: 'Teaching changes the brain’s response. In a small study of 20 children, activity in the left reading areas rose after a language and listening program.', ev: 'early', c: ['temple-2003-dyslexia-remediation', 'gabrieli-2009-dyslexia'] },
        { t: 'Tools that take reading off the critical path: audiobooks, read-aloud tools, extra time, voice notes.', ev: 'early', c: [] },
        { t: 'Praise ideas and effort, not spelling.', ev: 'early', c: [] }
      ],
      others: [
        { k: 'Ask', t: '“Would you rather I tell you or write it down?”' },
        { k: 'Do', t: 'Send short lines or a voice note, and leave spelling alone.' },
        { k: 'Do', t: 'Offer extra time and read-aloud tools without making it a favor.' }
      ]
    },
    {
      id: 'baseline', name: 'No label', chip: 'No label', color: '#5A5346',
      kind: 'A reference point, not a goal', kindNote: 'No diagnosis. It does not mean typical or standard.',
      summary: 'This is the comparison point on the map, not a goal. Everyone sits somewhere on every slider, and the middle is a crowd, not a person. All ten regions do the same jobs in every brain.',
      effects: [
        { r: 'whole', d: null, ev: 'moderate', c: ['yoo-walker-2007'],
          t: 'No label does not mean no variation. After a night without sleep, the amygdala reacted more strongly to negative pictures in one small study, so even the same brain varies from day to day.' },
        { r: 'whole', d: null, ev: 'moderate', c: ['maguire-2000-taxi-hippocampus'],
          t: 'Experience shapes the brain. The back part of the hippocampus was larger on average in London taxi drivers, and larger the longer they had driven.' }
      ],
      size: null,
      inside: [
        { s: 'A noisy store', t: 'At the end of a bad week, with little sleep, even a no-label brain finds the store too much.' },
        { s: 'A hard text', t: 'When you are tired, an ordinary text reads sharper than it was meant.' },
        { s: 'A long to-do list', t: 'Some days it is a list. Other days, with something on your mind, it is a wall.' },
        { s: 'Waking at 3 a.m.', t: 'Before a big day, almost everyone has a night like this one.' }
      ],
      outside: [
        { t: 'Looks like “being fine.” People with no label can still be struggling without anyone seeing it.' },
        { t: 'It is easy to treat your own experience as the standard and others as the exception. The map is a reminder that it is a range.' }
      ],
      helps: [
        { t: 'Enough sleep. A night without it changed how strongly the amygdala reacted.', ev: 'moderate', c: ['yoo-walker-2007'] },
        { t: 'Regular movement lowers symptoms of depression, anxiety and distress, across many trials.', ev: 'strong', c: ['singh-2023'] },
        { t: 'Staying connected to groups and people.', ev: 'moderate', c: ['cruwys-2013-groups'] }
      ],
      others: [
        { k: 'Ask', t: '“What would make this easier for you?” Ask it of everyone, not only people with a label.' },
        { k: 'Do', t: 'Treat a hard day as information about the day, not about the person.' },
        { k: 'Say', t: '“Tell me how it looks from where you are.”' }
      ]
    }
  ];

  // ---------- sliders: where each profile tends to sit compared with the baseline, drawn as ranges (0 to 100)
  B.dials = [
    { id: 'sensory', name: 'Sensory volume', low: 'Quiet', high: 'Loud', net: null, regions: ['thalamus', 'senses', 'insula'],
      blurb: 'How loud sights, sounds, touch, smells and body signals arrive.',
      feelHigh: 'The fridge hum, the shirt tag, three conversations and the bright aisle all arrive at once at full volume. A normal store costs a lot.',
      feelLow: 'Things arrive quietly. You might miss your name being called, a light touch, or being hungry or cold until it is large.' },
    { id: 'alarm', name: 'Alarm sensitivity', low: 'Calm', high: 'Quick', net: 'salience', regions: ['amygdala', 'insula', 'acc'],
      blurb: 'How fast and how big the “this matters, watch out” signal is.',
      feelHigh: 'A door slam, a short text or a stranger’s look sets your heart off, and settling takes a while.',
      feelLow: 'You stay steady when others startle. Sometimes you notice the signal late, after the moment has passed.' },
    { id: 'attention', name: 'Attention steering', low: 'Pulled around', high: 'Steady hand', net: 'control', regions: ['pfc', 'acc', 'tpj'],
      blurb: 'How easily you can point your attention where you choose, keep it there, and move it when you need to.',
      feelHigh: 'You decide to start the task and you start it. A noise comes and goes without taking over.',
      feelLow: 'You know what you meant to do and your attention goes elsewhere: the phone, a thought, the sound from the next room. Or it locks onto one thing and will not let go.' },
    { id: 'mood', name: 'Mood and energy baseline', low: 'Low', high: 'Bright', net: 'default', regions: ['pfc', 'hippocampus', 'striatum'],
      blurb: 'Where your mood and energy tend to sit on an ordinary day, and how fast they recover.',
      feelHigh: 'An ordinary day starts with some energy and interest, and a bad day passes in a day or two.',
      feelLow: 'Getting up, answering a message, or enjoying something you used to like takes effort. A bad day can stretch into weeks.' },
    { id: 'patterns', name: 'Pull of patterns and repeating', low: 'Loose', high: 'Strong', net: 'habit', regions: ['striatum', 'pfc', 'acc'],
      blurb: 'How strongly routines, rules, checking, sameness and repeated thoughts or interests draw you in.',
      feelHigh: 'The same order, the same route, the same check feels necessary. If it is interrupted, the day tips. A deep interest can feel like home.',
      feelLow: 'Routines slip. You do things differently each time, which is flexible, but can mean dropping what keeps life steady.' }
  ];

  // lo and hi are the middle 80 percent of that group, on a 0 to 100 slider. baseline is 20 to 80 for everyone.
  // ev says how well the direction is supported. c are the citations. Not measurements: a sketch of direction and overlap.
  B.baselineRange = [20, 80];
  B.ranges = {
    autism: {
      sensory: { lo: 38, hi: 97, ev: 'strong', c: ['benSasson-2009-sensory-asd', 'robertson-baroncohen-2017-sensory'], t: 'Sensory differences are very common and the whole range moves up, with some people also under-responding.' },
      alarm: { lo: 28, hi: 88, ev: 'early', c: ['hollocks-2019-autism-anxiety', 'jenkinson-2020-iu'], t: 'Anxiety is more common, and uncertainty is strongly tied to it. That does not mean every autistic person sits higher.' },
      attention: { lo: 10, hi: 88, ev: 'moderate', c: ['demetriou-2018-ef', 'murray-lesser-lawson-2005'], t: 'Scores on executive-function tasks were lower on average, with wide variation. Deep focus on interests can be very steady.' },
      mood: { lo: 14, hi: 74, ev: 'moderate', c: ['hollocks-2019-autism-anxiety'], t: 'Depression is more common, but many autistic people sit anywhere on this slider.' },
      patterns: { lo: 52, hi: 98, ev: 'moderate', c: ['grove-2018-special-interests'], t: 'Repeating routines and deep, lasting interests are part of how autism is defined, and about two thirds of autistic adults in one survey reported a special interest.' }
    },
    adhd: {
      sensory: { lo: 28, hi: 90, ev: 'early', c: ['panagiotidi-2017-adhd-sensory'], t: 'In one survey of 234 adults, more ADHD traits went with more sensory difficulties in every sense.' },
      alarm: { lo: 24, hi: 86, ev: 'early', c: ['shaw-2014-emotion-dysregulation-adhd'], t: 'Quick, strong feelings are common in ADHD, though this is about emotions in general, not only alarm.' },
      attention: { lo: 5, hi: 68, ev: 'moderate', c: ['cortese-2012-adhd-fmri', 'hoogman-2017-adhd-subcortical'], t: 'Less activity in control networks during attention tasks, on average. The range is wide, and interest can lock attention on.' },
      mood: { lo: 15, hi: 78, ev: 'early', c: ['shaw-2014-emotion-dysregulation-adhd'], t: 'Mood can swing faster. No clear shift in the middle.' },
      patterns: { lo: 10, hi: 76, ev: 'early', c: [], t: 'Mixed: routines are hard to keep for many, while interests can pull strongly.' }
    },
    anxiety: {
      sensory: { lo: 24, hi: 84, ev: 'early', c: [], t: 'No clear shift is established. Some people report noise and crowds hit harder when anxious.' },
      alarm: { lo: 52, hi: 98, ev: 'moderate', c: ['etkin-wager-2007-anxiety', 'shin-liberzon-2010-fear-circuits'], t: 'The alarm regions react more strongly to feared cues on average.' },
      attention: { lo: 12, hi: 72, ev: 'early', c: ['shin-liberzon-2010-fear-circuits'], t: 'Worry takes attention; front-of-brain results are mixed.' },
      mood: { lo: 12, hi: 66, ev: 'early', c: [], t: 'Anxiety and low mood often travel together.' },
      patterns: { lo: 32, hi: 88, ev: 'early', c: [], t: 'Checking, planning and avoiding can draw people in, though this is not what defines anxiety.' }
    },
    depression: {
      sensory: { lo: 18, hi: 78, ev: 'early', c: [], t: 'No clear shift is established.' },
      alarm: { lo: 26, hi: 86, ev: 'moderate', c: ['hamilton-2012-depression-fmri'], t: 'The amygdala was more active to negative material in pooled studies.' },
      attention: { lo: 10, hi: 70, ev: 'moderate', c: ['kaiser-2015-depression-networks', 'hamilton-2012-depression-fmri'], t: 'Less connectivity in the control network, and trouble concentrating is a common symptom.' },
      mood: { lo: 4, hi: 52, ev: 'strong', c: ['schmaal-2016-subcortical-mdd', 'schmaal-2017-cortical-mdd', 'nice-2022-depression'], t: 'Low mood and energy are what define depression. The brain differences are small, but the experience is not.' },
      patterns: { lo: 28, hi: 82, ev: 'strong', c: ['nolen-hoeksema-1991'], t: 'Rumination, the same thoughts going around, predicted longer depression in classic work.' }
    },
    trauma: {
      sensory: { lo: 30, hi: 92, ev: 'moderate', c: ['pole-2007-ptsd-physiology'], t: 'Startle and heart-rate responses were stronger on average in pooled studies.' },
      alarm: { lo: 56, hi: 99, ev: 'moderate', c: ['etkin-wager-2007-anxiety', 'hayes-2012-ptsd-meta', 'pole-2007-ptsd-physiology'], t: 'The amygdala and the insula are more active, and the heart beats faster, on average.' },
      attention: { lo: 10, hi: 68, ev: 'moderate', c: ['etkin-wager-2007-anxiety', 'hayes-2012-ptsd-meta'], t: 'Less activity in the front-of-brain regions that help settle the alarm. Staying on guard crowds out other attention.' },
      mood: { lo: 10, hi: 62, ev: 'early', c: [], t: 'Low mood often follows trauma but varies a lot.' },
      patterns: { lo: 34, hi: 90, ev: 'early', c: [], t: 'Avoiding reminders and re-living can be repeating patterns.' }
    },
    ocd: {
      sensory: { lo: 22, hi: 84, ev: 'early', c: [], t: 'No clear shift is established.' },
      alarm: { lo: 38, hi: 92, ev: 'early', c: ['milad-rauch-2012-ocd-circuits'], t: 'Circuits through the amygdala may matter; the picture is still being worked out.' },
      attention: { lo: 12, hi: 76, ev: 'early', c: ['menzies-2008-ocd-model'], t: 'Sticky thoughts can pull attention back; results are mixed.' },
      mood: { lo: 14, hi: 70, ev: 'early', c: [], t: 'Low mood often travels with OCD.' },
      patterns: { lo: 62, hi: 99, ev: 'strong', c: ['milad-rauch-2012-ocd-circuits', 'boedhoe-2017-ocd-subcortical', 'olatunji-2013-ocd-cbt'], t: 'Repeating thoughts and rituals are what define OCD, and the habit loops differ on average.' }
    },
    dyslexia: {
      sensory: { lo: 20, hi: 80, ev: 'early', c: [], t: 'No clear difference is established for senses in general. The difference is in linking letters to sounds.' },
      alarm: { lo: 20, hi: 80, ev: 'early', c: [], t: 'No clear difference is established.' },
      attention: { lo: 18, hi: 80, ev: 'early', c: [], t: 'No clear difference in attention in general. Reading takes more effort, which can wear anyone down.' },
      mood: { lo: 16, hi: 78, ev: 'early', c: [], t: 'No clear shift is established.' },
      patterns: { lo: 20, hi: 80, ev: 'early', c: [], t: 'No clear difference is established.' }
    },
    baseline: {
      sensory: { lo: 20, hi: 80, ev: 'moderate', c: [], t: 'The reference range.' },
      alarm: { lo: 20, hi: 80, ev: 'moderate', c: [], t: 'The reference range.' },
      attention: { lo: 20, hi: 80, ev: 'moderate', c: [], t: 'The reference range.' },
      mood: { lo: 20, hi: 80, ev: 'moderate', c: [], t: 'The reference range.' },
      patterns: { lo: 20, hi: 80, ev: 'moderate', c: [], t: 'The reference range.' }
    }
  };

  // ---------- the short, honest panel above the map
  B.before = {
    title: 'Before you read the map',
    paras: [
      'This is a map of group averages from research. People who share a label differ a lot from each other, and they overlap a great deal with people who do not have it. A scan cannot diagnose anyone, and nothing here is a diagnosis.',
      'Brains change with experience, sleep, support and treatment, so a difference is a snapshot, not a verdict. A difference is not damage, and it is not anyone’s fault.',
      'Some of these are lifelong neurodevelopmental differences: autistic, ADHD and dyslexic wiring. Others are health conditions that can improve: anxiety, depression, trauma and PTSD, and OCD. Both deserve understanding and support, and many people have more than one.'
    ],
    c: ['maguire-2000-taxi-hippocampus', 'mansson-2016-cbt-plasticity', 'holiga-2019-asd-connectivity'],
    overlapNote: 'A typical gap in the large scan studies below is about a tenth to a fifth of a standard deviation. If both groups are bell-shaped, the two curves overlap by more than 90 percent.'
  };

  // ---------- Compare mode and the sliders: short fixed lines
  B.ui = {
    chipsTitle: 'Pick a way of being wired',
    chipsHelp: 'You can pick more than one, because many people have more than one.',
    sliderNote: 'The bars are a sketch of direction and overlap, drawn from the research on each way of being wired. They are not measurements, and nobody can be placed on them by a label.',
    insideNote: 'This cutaway cuts a little to the side of the center, so the deep parts show together. It is a sketch, not to scale.',
    outsideNote: 'The left side of the brain, seen from outside. The front is on the left.'
  };

  // ---------- every citation. These records are the same as the entries in /research.html (tools/research/refs-*.json).
  B.citations = [
    {"id": "schmaal-2016-subcortical-mdd", "short": "Schmaal et al., 2016", "authors": "Schmaal, L., Veltman, D. J., van Erp, T. G. M., et al.", "year": 2016, "title": "Subcortical brain alterations in major depressive disorder: findings from the ENIGMA Major Depressive Disorder working group", "venue": "Molecular Psychiatry, 21(6), 806–812", "doi": "10.1038/mp.2015.69", "url": "https://doi.org/10.1038/mp.2015.69", "found": "Pooling scans from 1,728 people with major depression and 7,199 comparison people at 15 sites, the hippocampus was smaller on average in the depression group (a very small effect, about 1 percent). The difference was clearest in people with repeated episodes and in those whose depression began before age 21, and not seen in people in their first episode.", "strength": "strong: one of the largest pooled scan studies of depression. The effect is small, the groups overlap almost completely, and a scan study cannot say which came first."},
    {"id": "schmaal-2017-cortical-mdd", "short": "Schmaal et al., 2017", "authors": "Schmaal, L., Hibar, D. P., Sämann, P. G., et al.", "year": 2017, "title": "Cortical abnormalities in adults and adolescents with major depression based on brain scans from 20 cohorts worldwide in the ENIGMA Major Depressive Disorder working group", "venue": "Molecular Psychiatry, 22(6), 900–909", "doi": "10.1038/mp.2016.60", "url": "https://doi.org/10.1038/mp.2016.60", "found": "In scans of 2,148 people with major depression and 7,957 comparison people, adults with depression had slightly thinner cortex on average in the orbitofrontal cortex, the anterior and posterior cingulate, the insula and the temporal lobes (small effects, about 0.1 of a standard deviation). Adolescents showed a smaller total surface area instead.", "strength": "strong: a very large pooled scan study. The effects are small and the groups overlap almost completely."},
    {"id": "logue-2018-hippocampus-ptsd", "short": "Logue et al., 2018", "authors": "Logue, M. W., van Rooij, S. J. H., Dennis, E. L., et al.", "year": 2018, "title": "Smaller hippocampal volume in posttraumatic stress disorder: a multisite ENIGMA-PGC study", "venue": "Biological Psychiatry, 83(3), 244–253", "doi": "10.1016/j.biopsych.2017.09.006", "url": "https://doi.org/10.1016/j.biopsych.2017.09.006", "found": "Across 16 groups of researchers and 1,868 people, those with current PTSD had slightly smaller hippocampi on average than trauma-exposed people without PTSD (a small effect, about 0.17 of a standard deviation). The amygdala difference was smaller still and did not hold up after correcting for the number of regions tested.", "strength": "strong: a large pooled analysis with a fair comparison group (people who had also been through trauma). The effect is small and a scan study cannot say whether it was there before the trauma."},
    {"id": "hoogman-2017-adhd-subcortical", "short": "Hoogman et al., 2017", "authors": "Hoogman, M., Bralten, J., Hibar, D. P., et al.", "year": 2017, "title": "Subcortical brain volume differences in participants with attention deficit hyperactivity disorder in children and adults: a cross-sectional mega-analysis", "venue": "The Lancet Psychiatry, 4(4), 310–319", "doi": "10.1016/S2215-0366(17)30049-4", "url": "https://doi.org/10.1016/S2215-0366(17)30049-4", "found": "In 1,713 people with ADHD and 1,529 comparison people at 23 sites (ages 4 to 63, median 14), the nucleus accumbens, amygdala, caudate, hippocampus and putamen were slightly smaller on average in the ADHD group (very small effects, about 0.1 to 0.2 of a standard deviation). The differences were clearest in children and smaller in adults. The pallidum and thalamus did not differ.", "strength": "strong: a very large pooled scan study. The effects are very small and the groups overlap almost completely."},
    {"id": "hoogman-2019-adhd-cortex", "short": "Hoogman et al., 2019", "authors": "Hoogman, M., Muetzel, R., Guimaraes, J. P., et al.", "year": 2019, "title": "Brain imaging of the cortex in ADHD: a coordinated analysis of large-scale clinical and population-based samples", "venue": "American Journal of Psychiatry, 176(7), 531–542", "doi": "10.1176/appi.ajp.2019.18091033", "url": "https://doi.org/10.1176/appi.ajp.2019.18091033", "found": "Comparing the cortex of 2,246 people with ADHD and 1,934 comparison people from 36 centers, the authors found small average differences in cortical surface area in children, with some thickness differences. They found no differences in thickness or surface area in adolescents or adults. In a population sample of children, surface area also related, more weakly, to attention problems, which fits the view that ADHD sits at one end of a continuum.", "strength": "strong: a large coordinated analysis. The differences are small and were found in children, not in adolescents or adults."},
    {"id": "vanrooij-2018-enigma-asd", "short": "van Rooij et al., 2018", "authors": "van Rooij, D., Anagnostou, E., Arango, C., et al.", "year": 2018, "title": "Cortical and subcortical brain morphometry differences between patients with autism spectrum disorder and healthy individuals across the lifespan: results from the ENIGMA ASD working group", "venue": "American Journal of Psychiatry, 175(4), 359–369", "doi": "10.1176/appi.ajp.2017.17010100", "url": "https://doi.org/10.1176/appi.ajp.2017.17010100", "found": "Scans of 1,571 autistic people and 1,651 comparison people (ages 2 to 64, 49 sites) showed small average differences: slightly smaller pallidum, putamen, amygdala and nucleus accumbens, slightly thicker frontal cortex and slightly thinner temporal cortex (effect sizes about 0.1 to 0.2 of a standard deviation). The differences in cortical thickness were largest around adolescence.", "strength": "strong: the largest scan study of autism to date. The effects are very small, the groups overlap almost completely, and autistic people differ widely from each other."},
    {"id": "boedhoe-2017-ocd-subcortical", "short": "Boedhoe et al., 2017", "authors": "Boedhoe, P. S. W., Schmaal, L., Abe, Y., et al.", "year": 2017, "title": "Distinct subcortical volume alterations in pediatric and adult OCD: a worldwide meta- and mega-analysis", "venue": "American Journal of Psychiatry, 174(1), 60–69", "doi": "10.1176/appi.ajp.2016.16020201", "url": "https://doi.org/10.1176/appi.ajp.2016.16020201", "found": "Pooling scans from 1,830 people with OCD and 1,759 comparison people, adults with OCD had slightly smaller hippocampi and slightly larger pallidums on average (about 0.13 and 0.16 of a standard deviation), while children with OCD who were not taking medicine had larger thalamus volumes (about 0.38). The adult and child patterns differed.", "strength": "strong: a large pooled analysis. The effects are small to moderate and the groups overlap a great deal; medicine use affected the results."},
    {"id": "boedhoe-2018-ocd-cortical", "short": "Boedhoe et al., 2018", "authors": "Boedhoe, P. S. W., Schmaal, L., Abe, Y., et al.", "year": 2018, "title": "Cortical abnormalities associated with pediatric and adult obsessive-compulsive disorder: findings from the ENIGMA Obsessive-Compulsive Disorder working group", "venue": "American Journal of Psychiatry, 175(5), 453–462", "doi": "10.1176/appi.ajp.2017.17050485", "url": "https://doi.org/10.1176/appi.ajp.2017.17050485", "found": "In scans of 1,905 people with OCD and 1,760 comparison people from 27 sites, the inferior parietal cortex was slightly thinner in both adults and children with OCD. Adults also showed a smaller surface area in one part of the temporal cortex. Effect sizes ranged from about 0.1 to 0.3 of a standard deviation.", "strength": "strong: a large pooled analysis. The effects are small and medicine use affected some results."},
    {"id": "etkin-wager-2007-anxiety", "short": "Etkin and Wager, 2007", "authors": "Etkin, A., & Wager, T. D.", "year": 2007, "title": "Functional neuroimaging of anxiety: a meta-analysis of emotional processing in PTSD, social anxiety disorder, and specific phobia", "venue": "American Journal of Psychiatry, 164(10), 1476–1488", "doi": "10.1176/appi.ajp.2007.07030504", "url": "https://doi.org/10.1176/appi.ajp.2007.07030504", "found": "Pooling brain-activity studies, people with PTSD, social anxiety disorder or a specific phobia showed, on average, more activity in the amygdala and the insula than comparison people while handling emotional material, similar to what happens in healthy people during fear learning. Only in PTSD were the front-of-brain areas that help settle feelings (parts of the cingulate and the ventromedial prefrontal cortex) less active.", "strength": "moderate: a pooled analysis of many small studies from before 2007. Later work generally agrees, but individual studies vary and the groups overlap."},
    {"id": "hayes-2012-ptsd-meta", "short": "Hayes et al., 2012", "authors": "Hayes, J. P., Hayes, S. M., & Mikedis, A. M.", "year": 2012, "title": "Quantitative meta-analysis of neural activity in posttraumatic stress disorder", "venue": "Biology of Mood & Anxiety Disorders, 2, 9", "doi": "10.1186/2045-5380-2-9", "url": "https://doi.org/10.1186/2045-5380-2-9", "found": "Pooling 26 brain-activity studies, people with PTSD showed more activity on average in the middle and dorsal anterior cingulate and (when region-of-interest studies were included) the amygdala, and less activity in the ventromedial prefrontal cortex and the inferior frontal gyrus than comparison people.", "strength": "moderate: a pooled analysis of 26 studies. Results depend on the task and on which comparison group was used, and the groups overlap."},
    {"id": "shin-liberzon-2010-fear-circuits", "short": "Shin and Liberzon, 2010", "authors": "Shin, L. M., & Liberzon, I.", "year": 2010, "title": "The neurocircuitry of fear, stress, and anxiety disorders", "venue": "Neuropsychopharmacology, 35(1), 169–191", "doi": "10.1038/npp.2009.83", "url": "https://doi.org/10.1038/npp.2009.83", "found": "A review of animal and human work on fear circuits. In PTSD, social anxiety and specific phobia the amygdala tends to respond more strongly to cues tied to the fear, and the insula is often more active across several anxiety disorders. In PTSD the rostral anterior cingulate and nearby ventromedial prefrontal cortex tend to respond less. The authors note it is not yet clear which differences come first.", "strength": "moderate: an expert review that agrees with the pooled analyses. It cannot say what causes what."},
    {"id": "cortese-2012-adhd-fmri", "short": "Cortese et al., 2012", "authors": "Cortese, S., Kelly, C., Chabernaud, C., et al.", "year": 2012, "title": "Toward systems neuroscience of ADHD: a meta-analysis of 55 fMRI studies", "venue": "American Journal of Psychiatry, 169(10), 1038–1055", "doi": "10.1176/appi.ajp.2012.11101521", "url": "https://doi.org/10.1176/appi.ajp.2012.11101521", "found": "Pooling 55 brain-activity studies, people with ADHD showed on average less activation in the frontoparietal (control) and ventral attention networks, and more activation in the default network and some sensory and motor areas, than comparison people. The differences were seen even without other conditions or past stimulant use.", "strength": "moderate: a pooled analysis of 55 mostly small studies. Task choice matters, and the groups overlap a great deal."},
    {"id": "richlan-2009-dyslexia-meta", "short": "Richlan et al., 2009", "authors": "Richlan, F., Kronbichler, M., & Wimmer, H.", "year": 2009, "title": "Functional abnormalities in the dyslexic brain: a quantitative meta-analysis of neuroimaging studies", "venue": "Human Brain Mapping, 30(10), 3299–3308", "doi": "10.1002/hbm.20752", "url": "https://doi.org/10.1002/hbm.20752", "found": "Pooling 17 brain-activity studies of reading, people with dyslexia showed on average less activity in the left inferior parietal, superior temporal, middle and inferior temporal, and fusiform areas, and in the left inferior frontal gyrus, together with more activity in the primary motor cortex and anterior insula, which may be a way of working around the difficulty.", "strength": "moderate: a pooled analysis of 17 studies, with later reviews pointing the same way. Study sizes were small and the groups overlap."},
    {"id": "gabrieli-2009-dyslexia", "short": "Gabrieli, 2009", "authors": "Gabrieli, J. D. E.", "year": 2009, "title": "Dyslexia: a new synergy between education and cognitive neuroscience", "venue": "Science, 325(5938), 280–283", "doi": "10.1126/science.1171999", "url": "https://doi.org/10.1126/science.1171999", "found": "A review explaining that dyslexia often comes from difficulty linking the sounds of speech to letters, that brain studies of children with dyslexia show less engagement of the left temporoparietal cortex during reading, and that good teaching changes both reading and the brain's response. It argues that early, evidence-based teaching could prevent most reading failure.", "strength": "moderate: an influential expert review. The brain findings are averages with large overlap."},
    {"id": "temple-2003-dyslexia-remediation", "short": "Temple et al., 2003", "authors": "Temple, E., Deutsch, G. K., Poldrack, R. A., et al.", "year": 2003, "title": "Neural deficits in children with dyslexia ameliorated by behavioral remediation: evidence from functional MRI", "venue": "Proceedings of the National Academy of Sciences, 100(5), 2860–2865", "doi": "10.1073/pnas.0030098100", "url": "https://doi.org/10.1073/pnas.0030098100", "found": "In 20 children with dyslexia aged 8 to 12, a language and listening training program improved reading and language scores, and brain activity during sound-based tasks rose in the left temporoparietal cortex and left inferior frontal gyrus, moving closer to the pattern seen in typical readers.", "strength": "early: one small study with no matched untreated group of children with dyslexia. It shows the brain responds to teaching but cannot say how much."},
    {"id": "galuschka-2014-reading-treatments", "short": "Galuschka et al., 2014", "authors": "Galuschka, K., Ise, E., Krick, K., & Schulte-Körne, G.", "year": 2014, "title": "Effectiveness of treatment approaches for children and adolescents with reading disabilities: a meta-analysis of randomized controlled trials", "venue": "PLoS ONE, 9(2), e89900", "doi": "10.1371/journal.pone.0089900", "url": "https://doi.org/10.1371/journal.pone.0089900", "found": "Pooling 22 randomized trials, teaching that builds explicit links between sounds and letters (phonics) was the one approach with a clearly confirmed benefit for reading and spelling in children and adolescents with reading difficulties. The authors concluded that even severe reading and spelling difficulties can be improved with the right teaching.", "strength": "moderate: 22 randomized trials, but many were small, and other approaches had fewer studies, so they are not proven not to work."},
    {"id": "benSasson-2009-sensory-asd", "short": "Ben-Sasson et al., 2009", "authors": "Ben-Sasson, A., Hen, L., Fluss, R., et al.", "year": 2009, "title": "A meta-analysis of sensory modulation symptoms in individuals with autism spectrum disorders", "venue": "Journal of Autism and Developmental Disorders, 39(1), 1–11", "doi": "10.1007/s10803-008-0593-3", "url": "https://doi.org/10.1007/s10803-008-0593-3", "found": "Pooling 14 studies, autistic people reported or showed more sensory differences than comparison groups. The gap was largest for under-responding to sensations, then over-responding, then seeking sensations. The differences were largest in children aged 6 to 9.", "strength": "strong: a pooled analysis, backed by an update and by later reviews. Most studies relied on parent or self report."},
    {"id": "robertson-baroncohen-2017-sensory", "short": "Robertson and Baron-Cohen, 2017", "authors": "Robertson, C. E., & Baron-Cohen, S.", "year": 2017, "title": "Sensory perception in autism", "venue": "Nature Reviews Neuroscience, 18(11), 671–684", "doi": "10.1038/nrn.2017.112", "url": "https://doi.org/10.1038/nrn.2017.112", "found": "A review arguing that sensory experience is a central part of autism, noting that unusual sensory experience may affect as many as nine in ten autistic people, across all the senses, and discussing what is known about how sensory processing works differently.", "strength": "moderate: an expert review. The explanations for why are still being tested."},
    {"id": "hull-2016-rsfc-asd", "short": "Hull et al., 2017 (connectivity)", "authors": "Hull, J. V., Jacokes, Z. J., Torgerson, C. M., Irimia, A., & Van Horn, J. D.", "year": 2017, "title": "Resting-state functional connectivity in autism spectrum disorders: a review", "venue": "Frontiers in Psychiatry, 7, 205", "doi": "10.3389/fpsyt.2016.00205", "url": "https://doi.org/10.3389/fpsyt.2016.00205", "found": "A review of brain-connectivity studies in autism. Studies have reported more connectivity, less connectivity, or a mix, and the authors link the differences between studies to age, sex, scan design and the wide variation among autistic people.", "strength": "moderate: a review whose main message is that results are mixed."},
    {"id": "holiga-2019-asd-connectivity", "short": "Holiga et al., 2019", "authors": "Holiga, Š., Hipp, J. F., Chatham, C. H., et al.", "year": 2019, "title": "Patients with autism spectrum disorders display reproducible functional connectivity alterations", "venue": "Science Translational Medicine, 11(481), eaat9223", "doi": "10.1126/scitranslmed.aat9223", "url": "https://doi.org/10.1126/scitranslmed.aat9223", "found": "In several large data sets, autistic people showed a reproducible pattern of differences in how brain regions work together. The pattern was only moderately linked to day-to-day traits and overlapped a lot with comparison people, so the authors say it is not usable for diagnosis.", "strength": "moderate: replicated across several data sets, with a large overlap between groups."},
    {"id": "woodward-2017-thalamus-asd", "short": "Woodward et al., 2017", "authors": "Woodward, N. D., Giraldo-Chica, M., Rogers, B., & Cascio, C. J.", "year": 2017, "title": "Thalamocortical dysconnectivity in autism spectrum disorder: an analysis of the Autism Brain Imaging Data Exchange", "venue": "Biological Psychiatry: Cognitive Neuroscience and Neuroimaging, 2(1), 76–84", "doi": "", "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC5455796/", "found": "Comparing 228 autistic people with 228 matched comparison people, the thalamus was more strongly connected on average with prefrontal, temporal and sensory-motor cortex in the autism group, most clearly in adolescents. Other studies have found less connectivity in some thalamus pathways, so the direction is not settled.", "strength": "early: one data set, and other studies point in mixed directions."},
    {"id": "stoodley-2014-cerebellum", "short": "Stoodley, 2014", "authors": "Stoodley, C. J.", "year": 2014, "title": "Distinct regions of the cerebellum show gray matter decreases in autism, ADHD, and developmental dyslexia", "venue": "Frontiers in Systems Neuroscience, 8, 92", "doi": "10.3389/fnsys.2014.00092", "url": "https://doi.org/10.3389/fnsys.2014.00092", "found": "Pooling scan studies of autism (17), ADHD (10) and dyslexia (10), no cerebellar area was larger in any group, and each condition had smaller gray matter in a different part of the cerebellum, with no overlap between conditions.", "strength": "early: a pooled analysis of mostly small scan studies; the sizes are modest and the groups overlap."},
    {"id": "menon-2011-triple-network", "short": "Menon, 2011", "authors": "Menon, V.", "year": 2011, "title": "Large-scale brain networks and psychopathology: a unifying triple network model", "venue": "Trends in Cognitive Sciences, 15(10), 483–506", "doi": "10.1016/j.tics.2011.08.003", "url": "https://doi.org/10.1016/j.tics.2011.08.003", "found": "Proposed that problems in how three large networks switch on and off, the salience, frontoparietal and default networks, show up across many conditions, with the salience network acting as a switch between the other two.", "strength": "moderate: an influential model that has guided much research. It is a framework to test, not a settled finding."},
    {"id": "kaiser-2015-depression-networks", "short": "Kaiser et al., 2015", "authors": "Kaiser, R. H., Andrews-Hanna, J. R., Wager, T. D., & Pizzagalli, D. A.", "year": 2015, "title": "Large-scale network dysfunction in major depressive disorder: a meta-analysis of resting-state functional connectivity", "venue": "JAMA Psychiatry, 72(6), 603–611", "doi": "10.1001/jamapsychiatry.2015.0071", "url": "https://doi.org/10.1001/jamapsychiatry.2015.0071", "found": "Pooling 27 data sets (556 people with depression and 518 comparison people), depression was linked on average to less connectivity within the frontoparietal control network and between it and a network that directs attention to the outside world.", "strength": "moderate: a pooled analysis of mostly small studies; the differences are modest and the groups overlap."},
    {"id": "hamilton-2012-depression-fmri", "short": "Hamilton et al., 2012", "authors": "Hamilton, J. P., Etkin, A., Furman, D. J., et al.", "year": 2012, "title": "Functional neuroimaging of major depressive disorder: a meta-analysis and new integration of baseline activation and neural response data", "venue": "American Journal of Psychiatry, 169(7), 693–703", "doi": "10.1176/appi.ajp.2012.11071105", "url": "https://doi.org/10.1176/appi.ajp.2012.11071105", "found": "In response to negative material, people with depression showed on average more activity in the amygdala, insula and dorsal anterior cingulate cortex, and less in the dorsal striatum and dorsolateral prefrontal cortex, than comparison people.", "strength": "moderate: a pooled analysis of many small studies; results depend on the task, and the groups overlap."},
    {"id": "milad-rauch-2012-ocd-circuits", "short": "Milad and Rauch, 2012", "authors": "Milad, M. R., & Rauch, S. L.", "year": 2012, "title": "Obsessive-compulsive disorder: beyond segregated cortico-striatal pathways", "venue": "Trends in Cognitive Sciences, 16(1), 43–51", "doi": "10.1016/j.tics.2011.11.003", "url": "https://doi.org/10.1016/j.tics.2011.11.003", "found": "A review arguing that OCD involves more than the loops linking the front of the brain, the striatum and the thalamus: the orbitofrontal cortex, the dorsal anterior cingulate and circuits through the amygdala also matter, and learning that a fear is no longer needed (extinction) may work differently.", "strength": "moderate: an expert review of imaging and treatment studies. It describes circuits that appear involved, and cannot say what causes what."},
    {"id": "menzies-2008-ocd-model", "short": "Menzies et al., 2008", "authors": "Menzies, L., Chamberlain, S. R., Laird, A. R., et al.", "year": 2008, "title": "Integrating evidence from neuroimaging and neuropsychological studies of obsessive-compulsive disorder: the orbitofronto-striatal model revisited", "venue": "Neuroscience & Biobehavioral Reviews, 32(3), 525–549", "doi": "10.1016/j.neubiorev.2007.09.005", "url": "https://doi.org/10.1016/j.neubiorev.2007.09.005", "found": "A review and pooled analysis of brain-imaging studies of OCD. It tests the long-standing idea of an orbitofrontal-striatal loop and proposes a wider picture that includes other areas, including parts of the parietal cortex.", "strength": "moderate: an expert review and pooled analysis from before the large scan studies."},
    {"id": "pole-2007-ptsd-physiology", "short": "Pole, 2007", "authors": "Pole, N.", "year": 2007, "title": "The psychophysiology of posttraumatic stress disorder: a meta-analysis", "venue": "Psychological Bulletin, 133(5), 725–746", "doi": "10.1037/0033-2909.133.5.725", "url": "https://doi.org/10.1037/0033-2909.133.5.725", "found": "Pooling studies of the body's responses, adults with PTSD had a faster heart rate than adults without PTSD at rest, during startle tests and when reminded of the trauma. Heart rate was among the most consistent differences. Most studies were of male veterans.", "strength": "moderate: a pooled analysis of many studies, but one limited to the groups that were studied most."},
    {"id": "mansson-2016-cbt-plasticity", "short": "Månsson et al., 2016", "authors": "Månsson, K. N. T., Salami, A., Frick, A., et al.", "year": 2016, "title": "Neuroplasticity in response to cognitive behavior therapy for social anxiety disorder", "venue": "Translational Psychiatry, 6, e727", "doi": "10.1038/tp.2015.218", "url": "https://doi.org/10.1038/tp.2015.218", "found": "In 26 people with social anxiety disorder who had nine weeks of internet-delivered cognitive behavioral therapy, the amygdala's volume and its response to criticism both fell on average, and the drop in volume tracked the drop in anxiety. A comparison treatment did not show the same changes.", "strength": "early: one small trial, though it shows that the brain responds to effective treatment."},
    {"id": "maguire-2000-taxi-hippocampus", "short": "Maguire et al., 2000", "authors": "Maguire, E. A., Gadian, D. G., Johnsrude, I. S., et al.", "year": 2000, "title": "Navigation-related structural change in the hippocampi of taxi drivers", "venue": "Proceedings of the National Academy of Sciences, 97(8), 4398–4403", "doi": "10.1073/pnas.070039597", "url": "https://doi.org/10.1073/pnas.070039597", "found": "The back part of the hippocampus was larger on average in London taxi drivers than in comparison people, and it was larger the longer someone had driven a taxi, which suggests the adult brain changes with long experience.", "strength": "moderate: a classic study with many follow-ups on brain change. It links experience and size and cannot prove one caused the other."},
    {"id": "panagiotidi-2017-adhd-sensory", "short": "Panagiotidi et al., 2017", "authors": "Panagiotidi, M., Overton, P. G., & Stafford, T.", "year": 2017, "title": "The relationship between ADHD traits and sensory sensitivity in the general population", "venue": "Comprehensive Psychiatry, 80, 179–185", "doi": "", "url": "https://eprints.whiterose.ac.uk/123425/", "found": "In an online survey of 234 adults, more ADHD traits went with more reported sensory difficulties in every sense, suggesting sensory differences may be part of the ADHD picture.", "strength": "early: a single survey of adults from the general population, with self-report only."},
    {"id": "cortese-2018-adhd-medications", "short": "Cortese et al., 2018", "authors": "Cortese, S., Adamo, N., Del Giovane, C., et al.", "year": 2018, "title": "Comparative efficacy and tolerability of medications for attention-deficit hyperactivity disorder in children, adolescents, and adults: a systematic review and network meta-analysis", "venue": "The Lancet Psychiatry, 5(9), 727–738", "doi": "10.1016/S2215-0366(18)30269-4", "url": "https://doi.org/10.1016/S2215-0366(18)30269-4", "found": "Pooling 133 double-blind trials, medicines for ADHD reduced core symptoms in the short term. Taking both benefit and side effects into account, methylphenidate (for children and teenagers) and amphetamines (for adults) came out as the preferred first choices. The authors called for studies of long-term effects.", "strength": "strong: a large analysis of 133 randomized trials, but short-term, and the long-term evidence is thin."},
    {"id": "olatunji-2013-ocd-cbt", "short": "Olatunji et al., 2013", "authors": "Olatunji, B. O., Davis, M. L., Powers, M. B., & Smits, J. A. J.", "year": 2013, "title": "Cognitive-behavioral therapy for obsessive-compulsive disorder: a meta-analysis of treatment outcome and moderators", "venue": "Journal of Psychiatric Research, 47(1), 33–41", "doi": "10.1016/j.jpsychires.2012.08.020", "url": "https://doi.org/10.1016/j.jpsychires.2012.08.020", "found": "Pooling 16 randomized trials (756 people), cognitive behavioral therapy, centered on exposure and response prevention, reduced OCD symptoms much more than control conditions right after treatment, with a smaller but lasting benefit at follow-up.", "strength": "strong: pooled randomized trials with a large effect. Follow-up results are smaller and the trials vary in quality."},
    {"id": "hofmann-2012-cbt", "short": "Hofmann et al., 2012", "authors": "Hofmann, S. G., Asnaani, A., Vonk, I. J. J., Sawyer, A. T., & Fang, A.", "year": 2012, "title": "The efficacy of cognitive behavioral therapy: A review of meta-analyses", "venue": "Cognitive Therapy and Research, 36(5), 427–440", "doi": "10.1007/s10608-012-9476-1", "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC3584580/", "found": "Reviewing 106 meta-analyses of cognitive behavioral therapy, found the strongest support for anxiety problems, bulimia, anger and general stress, with support across many other problems. Few studies looked at groups such as ethnic minorities or people on low incomes.", "strength": "strong, a review of many meta-analyses. Quality of the underlying trials varies"},
    {"id": "nice-cg113-anxiety-panic", "short": "NICE 2011", "authors": "National Institute for Health and Care Excellence (NICE)", "year": 2011, "title": "Generalised anxiety disorder and panic disorder in adults: management (CG113)", "venue": "NICE guideline (updated 2020)", "doi": "", "url": "https://www.nice.org.uk/guidance/cg113", "found": "Recommends stepped care: self-help first, then CBT or applied relaxation (or medicine) for generalized anxiety, and CBT for panic disorder.", "strength": "strong: a national guideline based on reviews of trials."},
    {"id": "nice-cg159-social-anxiety", "short": "NICE 2013", "authors": "National Institute for Health and Care Excellence (NICE)", "year": 2013, "title": "Social anxiety disorder: recognition, assessment and treatment (CG159)", "venue": "NICE guideline", "doi": "", "url": "https://www.nice.org.uk/guidance/cg159", "found": "Recommends individual CBT developed specifically for social anxiety for adults with social anxiety disorder.", "strength": "strong: a national guideline based on reviews of trials."},
    {"id": "craske-2014-exposure", "short": "Craske et al., 2014", "authors": "Craske, M. G., Treanor, M., Conway, C. C., Zbozinek, T., & Vervliet, B.", "year": 2014, "title": "Maximizing exposure therapy: An inhibitory learning approach", "venue": "Behaviour Research and Therapy, 58, 10–23", "doi": "10.1016/j.brat.2014.04.006", "url": "https://doi.org/10.1016/j.brat.2014.04.006", "found": "Describes exposure therapy for anxiety as building new learning that competes with old fear, and sets out ways to strengthen it, such as testing specific expectations, dropping safety behaviors and practicing in varied settings.", "strength": "moderate, theory-led clinical review drawing on lab and treatment research"},
    {"id": "singh-2023", "short": "Singh et al., 2023", "authors": "Singh, B., et al.", "year": 2023, "title": "Effectiveness of physical activity interventions for improving depression, anxiety and distress: an overview of systematic reviews", "venue": "British Journal of Sports Medicine", "doi": "10.1136/bjsports-2022-106195", "url": "https://doi.org/10.1136/bjsports-2022-106195", "found": "An overview of 97 reviews (1,039 trials, about 128,000 people) found physical activity reduced symptoms of depression, anxiety and distress compared with usual care, with medium-sized effects.", "strength": "strong: a very large body of trials. The trials vary a lot in quality and type of exercise."},
    {"id": "freeman-2017-oasis", "short": "Freeman et al., 2017", "authors": "Freeman, D., Sheaves, B., et al.", "year": 2017, "title": "The effects of improving sleep on mental health (OASIS): A randomised controlled trial with mediation analysis", "venue": "The Lancet Psychiatry, 4(10), 749–758", "doi": "10.1016/S2215-0366(17)30328-0", "url": "https://doi.org/10.1016/S2215-0366(17)30328-0", "found": "In 3,755 university students with insomnia, an online CBT course for sleep greatly reduced insomnia and also reduced paranoid thoughts and hallucinatory experiences compared with usual care, with better sleep explaining much of the change.", "strength": "strong, very large randomized trial. Students only, so results may not apply to everyone"},
    {"id": "ekers-2014-ba", "short": "Ekers et al., 2014", "authors": "Ekers, D., Webster, L., Van Straten, A., Cuijpers, P., Richards, D., & Gilbody, S.", "year": 2014, "title": "Behavioural activation for depression; an update of meta-analysis of effectiveness and sub group analysis", "venue": "PLoS ONE, 9(6), e100100", "doi": "10.1371/journal.pone.0100100", "url": "https://doi.org/10.1371/journal.pone.0100100", "found": "Across 26 randomized trials (1,524 people), behavioral activation, planning and doing small valued activities, reduced depression more than control conditions, and at least as much as medication in the four trials that compared them.", "strength": "moderate, consistent effects, but most studies were small or low quality with short follow-up"},
    {"id": "nice-2022-depression", "short": "NICE 2022", "authors": "National Institute for Health and Care Excellence (NICE)", "year": 2022, "title": "Depression in adults: treatment and management (NG222)", "venue": "NICE guideline NG222, London", "doi": "", "url": "https://www.nice.org.uk/guidance/ng222", "found": "The national health guideline for England on depression: recommends a choice of treatments made together with the person, including guided self-help, group or individual CBT and behavioral activation, group exercise, other talking therapies and antidepressants.", "strength": "strong, an official guideline based on systematic reviews. Some methods have been criticized"},
    {"id": "kuyken-2016-mbct", "short": "Kuyken et al., 2016", "authors": "Kuyken, W., et al.", "year": 2016, "title": "Efficacy of mindfulness-based cognitive therapy in prevention of depressive relapse: an individual patient data meta-analysis from randomized trials", "venue": "JAMA Psychiatry, 73(6), 565–574", "doi": "10.1001/jamapsychiatry.2016.0076", "url": "https://doi.org/10.1001/jamapsychiatry.2016.0076", "found": "Across nine trials (1,258 people with recurrent depression), mindfulness-based cognitive therapy cut the risk of relapse over 60 weeks by about 31% (38% relapsed versus 49%).", "strength": "strong: an individual-patient meta-analysis of randomized trials."},
    {"id": "cruwys-2013-groups", "short": "Cruwys et al., 2013", "authors": "Cruwys, T., Dingle, G. A., Haslam, C., Haslam, S. A., Jetten, J., & Morton, T. A.", "year": 2013, "title": "Social group memberships protect against future depression, alleviate depression symptoms and prevent depression relapse", "venue": "Social Science & Medicine, 98, 179–186", "doi": "10.1016/j.socscimed.2013.09.013", "url": "https://doi.org/10.1016/j.socscimed.2013.09.013", "found": "In population data on adults aged 50 and over followed for two to four years, belonging to fewer groups predicted more depression later. Among people already depressed, joining one group was linked to a 24% lower risk of relapse and joining three to a 63% lower risk.", "strength": "moderate, large longitudinal samples, but observational, so links rather than proof"},
    {"id": "nice-ng116-ptsd", "short": "NICE 2018", "authors": "National Institute for Health and Care Excellence (NICE)", "year": 2018, "title": "Post-traumatic stress disorder (NG116)", "venue": "NICE guideline", "doi": "", "url": "https://www.nice.org.uk/guidance/ng116", "found": "Recommends trauma-focused CBT for adults with PTSD, and EMDR for adults with PTSD more than three months after a non-combat trauma.", "strength": "strong: a national guideline based on reviews of trials."},
    {"id": "crompton-2020", "short": "Crompton et al., 2020", "authors": "Crompton, C. J., Ropar, D., Evans-Williams, C. V. M., Flynn, E. G., & Fletcher-Watson, S.", "year": 2020, "title": "Autistic peer-to-peer information transfer is highly effective", "venue": "Autism, 24(7), 1704–1712", "doi": "10.1177/1362361320919286", "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC7545656/", "found": "In \"diffusion chains\" where a story was passed along eight people (72 adults), all-autistic chains passed on as much detail as all-non-autistic chains, while mixed chains lost detail faster and reported lower rapport.", "strength": "moderate: a careful experiment that supports the double empathy idea. Modest sample and a single task."},
    {"id": "milton-2012", "short": "Milton, 2012", "authors": "Milton, D. E. M.", "year": 2012, "title": "On the ontological status of autism: The “double empathy problem”", "venue": "Disability & Society, 27(6), 883–887", "doi": "", "url": "https://www.autism.org.uk/advice-and-guidance/professional-practice/double-empathy", "found": "A short conceptual paper arguing that misunderstanding between autistic and non-autistic people runs both ways: each side finds the other hard to read, so the problem lies between them, not only in the autistic person.", "strength": "early: a conceptual paper, not a test of one. no data in the paper itself. Later experiments (e.g. Crompton and colleagues, 2020) support parts of it"},
    {"id": "sasson-2017", "short": "Sasson et al., 2017", "authors": "Sasson, N. J., Faso, D. J., Nugent, J., Lovell, S., Kennedy, D. P., & Grossman, R. B.", "year": 2017, "title": "Neurotypical peers are less willing to interact with those with autism based on thin slice judgments", "venue": "Scientific Reports, 7, 40700", "doi": "10.1038/srep40700", "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC5286449/", "found": "Across three studies, non-autistic observers formed less favorable first impressions of autistic children and adults from a few seconds of video, and were less willing to interact with them. The bias disappeared when they judged only transcripts of what was said.", "strength": "moderate: three studies with consistent results. Suggests style, not substance, drives the bias."},
    {"id": "hull-2017", "short": "Hull et al., 2017 (camouflaging)", "authors": "Hull, L., Petrides, K. V., Allison, C., Smith, P., Baron-Cohen, S., Lai, M.-C., & Mandy, W.", "year": 2017, "title": "\"Putting on my best normal\": Social camouflaging in adults with autism spectrum conditions", "venue": "Journal of Autism and Developmental Disorders, 47(8), 2519–2534", "doi": "10.1007/s10803-017-3166-5", "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC5509825/", "found": "Interviews with 92 autistic adults described camouflaging as motivated by wanting to fit in and connect, done through masking and compensating techniques, and often followed by exhaustion and threats to self-perception.", "strength": "moderate: a qualitative study that shaped later measurement work."},
    {"id": "raymaker-2020", "short": "Raymaker et al., 2020", "authors": "Raymaker, D. M., Teo, A. R., Steckler, N. A., et al.", "year": 2020, "title": "\"Having all of your internal resources exhausted beyond measure and being left with no clean-up crew\": Defining autistic burnout", "venue": "Autism in Adulthood, 2(2), 132–143", "doi": "10.1089/aut.2019.0079", "url": "https://pubmed.ncbi.nlm.nih.gov/32851204/", "found": "From 19 interviews and 19 public online accounts, analyzed with autistic co-researchers, autistic burnout was defined as long-term exhaustion, loss of function and reduced tolerance to stimulus, arising from chronic life stress and a mismatch between expectations and abilities without enough support.", "strength": "early: the first formal definition, from a qualitative community-based study. Distinct from occupational burnout and depression in participants' accounts."},
    {"id": "grove-2018-special-interests", "short": "Grove et al., 2018", "authors": "Grove, R., Hoekstra, R. A., Wierda, M., & Begeer, S.", "year": 2018, "title": "Special interests and subjective wellbeing in autistic adults", "venue": "Autism Research, 11(5), 766–775", "doi": "", "url": "https://research.vu.nl/en/publications/special-interests-and-subjective-wellbeing-in-autistic-adults/", "found": "In a survey of autistic adults in the Netherlands Autism Register, about two-thirds reported a special interest. Greater motivation for the interest was linked to higher wellbeing, while very high intensity of engagement was linked to lower wellbeing.", "strength": "moderate, large survey, cross-sectional and self-report"},
    {"id": "jenkinson-2020-iu", "short": "Jenkinson et al., 2020", "authors": "Jenkinson, R., Milne, E., & Thompson, A.", "year": 2020, "title": "The relationship between intolerance of uncertainty and anxiety in autism: A systematic literature review and meta-analysis", "venue": "Autism, 24(8), 1933–1944", "doi": "10.1177/1362361320932437", "url": "https://doi.org/10.1177/1362361320932437", "found": "Across 10 studies pooled in a meta-analysis (12 reviewed), finding uncertainty hard to bear was strongly linked with anxiety in autistic people (r = 0.62), a link of similar size to that found in non-autistic people.", "strength": "moderate: a meta-analysis, but of a small number of studies with methodological concerns. Correlational"},
    {"id": "hollocks-2019-autism-anxiety", "short": "Hollocks et al., 2019", "authors": "Hollocks, M. J., Lerh, J. W., Magiati, I., Meiser-Stedman, R., & Brugha, T. S.", "year": 2019, "title": "Anxiety and depression in adults with autism spectrum disorder: A systematic review and meta-analysis", "venue": "Psychological Medicine, 49(4), 559–572", "doi": "10.1017/S0033291718002283", "url": "https://ueaeprints.uea.ac.uk/id/eprint/68116/", "found": "Pooling 35 studies, estimated that about 27% of autistic adults had an anxiety disorder at the time (42% over their lifetime) and about 23% had depression (37% lifetime), with wide variation between studies.", "strength": "moderate, meta-analysis. Very varied methods and many clinical samples"},
    {"id": "demetriou-2018-ef", "short": "Demetriou et al., 2018", "authors": "Demetriou, E. A., Lampit, A., Quintana, D. S., et al.", "year": 2018, "title": "Autism spectrum disorders: A meta-analysis of executive function", "venue": "Molecular Psychiatry, 23, 1198–1204", "doi": "10.1038/mp.2017.75", "url": "https://doi.org/10.1038/mp.2017.75", "found": "Pooling 235 studies with over 14,000 participants, found that autistic people on average scored lower than non-autistic people across executive function tasks, with wide variation and mixed findings across ages.", "strength": "moderate, large meta-analysis of lab tasks, which capture only part of daily life"},
    {"id": "murray-lesser-lawson-2005", "short": "Murray et al., 2005", "authors": "Murray, D., Lesser, M., & Lawson, W.", "year": 2005, "title": "Attention, monotropism and the diagnostic criteria for autism", "venue": "Autism, 9(2), 139–156", "doi": "10.1177/1362361305051398", "url": "https://pubmed.ncbi.nlm.nih.gov/15857859/", "found": "Proposed \"monotropism\": autistic attention tends to be pulled strongly into a few interests at a time, and the authors argued this can explain the other diagnostic features of autism.", "strength": "early: a conceptual paper, not a test of one. an influential, autistic-led account. Empirical testing is still limited."},
    {"id": "pfeiffer-2019-headphones", "short": "Pfeiffer et al., 2019", "authors": "Pfeiffer, B., Stein Duker, L., Murphy, A., & Shui, C.", "year": 2019, "title": "Effectiveness of noise-attenuating headphones on physiological responses for children with autism spectrum disorders", "venue": "Frontiers in Integrative Neuroscience, 13, 65", "doi": "10.3389/fnint.2019.00065", "url": "https://doi.org/10.3389/fnint.2019.00065", "found": "In six autistic children, wearing noise-attenuating headphones during the day changed skin-conductance measures of stress compared with baseline.", "strength": "early: a single-subject design with six children."},
    {"id": "shaw-2014-emotion-dysregulation-adhd", "short": "Shaw et al., 2014", "authors": "Shaw, P., Stringaris, A., Nigg, J., & Leibenluft, E.", "year": 2014, "title": "Emotion dysregulation in attention deficit hyperactivity disorder", "venue": "American Journal of Psychiatry, 171(3), 276-293", "doi": "10.1176/appi.ajp.2013.13070966", "url": "https://pubmed.ncbi.nlm.nih.gov/24480998/", "found": "A literature review found that trouble regulating emotions (quick, strong feelings that are hard to bring back down) is common in ADHD across the lifespan, with clinic studies of young people putting it at roughly 25 to 50 percent, and that it adds a lot to the day-to-day difficulty ADHD brings.", "strength": "moderate: a widely cited review. The estimates come mostly from clinic samples, and how emotion dysregulation fits into ADHD is still debated."},
    {"id": "cerrillo-urbina-2015-exercise-adhd", "short": "Cerrillo-Urbina et al., 2015", "authors": "Cerrillo-Urbina, A. J., García-Hermoso, A., Sánchez-López, M., Pardo-Guijarro, M. J., Santos Gómez, J. L., & Martínez-Vizcaíno, V.", "year": 2015, "title": "The effects of physical exercise in children with attention deficit hyperactivity disorder: a systematic review and meta-analysis of randomized control trials", "venue": "Child: Care, Health and Development, 41(6), 779–788", "doi": "10.1111/cch.12255", "url": "https://doi.org/10.1111/cch.12255", "found": "Across eight small trials (249 children with ADHD), exercise, especially aerobic exercise, improved attention, hyperactivity and related symptoms compared with control groups.", "strength": "moderate: a meta-analysis of small randomized trials."},
    {"id": "yoo-walker-2007", "short": "Yoo et al., 2007", "authors": "Yoo, S.-S., Gujar, N., Hu, P., Jolesz, F. A., & Walker, M. P.", "year": 2007, "title": "The human emotional brain without sleep—a prefrontal amygdala disconnect", "venue": "Current Biology, 17(20), R877–R878", "doi": "10.1016/j.cub.2007.08.007", "url": "https://doi.org/10.1016/j.cub.2007.08.007", "found": "After a night without sleep, the amygdala reacted more strongly to negative pictures and was less connected to the prefrontal cortex.", "strength": "moderate: a small lab study, consistent with later sleep research."},
    {"id": "lieberman-2007", "short": "Lieberman et al., 2007", "authors": "Lieberman, M. D., Eisenberger, N. I., Crockett, M. J., Tom, S. M., Pfeifer, J. H., & Way, B. M.", "year": 2007, "title": "Putting feelings into words: Affect labeling disrupts amygdala activity in response to affective stimuli", "venue": "Psychological Science, 18(5), 421–428", "doi": "10.1111/j.1467-9280.2007.01916.x", "url": "https://doi.org/10.1111/j.1467-9280.2007.01916.x", "found": "In a brain-imaging study, labeling the emotion in a picture reduced amygdala and other limbic responses compared with other ways of processing the image.", "strength": "moderate: replicated lab finding. Effects are modest and mostly measured with pictures in the lab."},
    {"id": "nolen-hoeksema-1991", "short": "Nolen-Hoeksema, 1991", "authors": "Nolen-Hoeksema, S.", "year": 1991, "title": "Responses to depression and their effects on the duration of depressive episodes", "venue": "Journal of Abnormal Psychology, 100(4), 569–582", "doi": "10.1037/0021-843X.100.4.569", "url": "https://doi.org/10.1037/0021-843X.100.4.569", "found": "Proposed the response styles theory: people who ruminate on their low mood tend to have longer depressions than people who distract themselves.", "strength": "strong: extensive, consistent later research."}
  ];
})();
