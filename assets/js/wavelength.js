/* wavelength.js — Wavelength: how you think, talk and listen.
   Pick your wiring (optional, select all that apply), answer seven short parts with either/or taps and tap-to-select
   statements, choose the inputs you learn through and what helps you, and (if you like) build a personal statement.
   Then read your four-letter Wave Code, your archetype, what each letter means, and sixteen self-discovery chapters:
   seven for your Wave Code and nine for the inputs of learning, plus a page on how the nine inputs connect.
   The statement part is the old Your Heartprint tool (its steps and its "Things you might not have noticed").
   Everything happens in this browser. Nothing you type or choose is sent anywhere. Your answers and journal are kept
   on this device only if you turn that on, and "Erase everything" removes them. Older Heartprint drafts
   ('tol-heartprint-v1', and before that 'tol-pawprint-v1') move here so nobody loses their answers. */
(function () {
  'use strict';
  const root = document.querySelector('[data-wavelength]');
  if (!root) return;
  const KEY = 'tol-wavelength-v1', OLD_KEYS = ['tol-heartprint-v1', 'tol-pawprint-v1'];

  /* ---------- wiring ---------- */
  const NEUROTYPES = [
    { id: 'nt', label: 'Neurotypical', desc: 'Most everyday settings feel built for how I think.',
      about: 'Your brain works the way most schools, workplaces and social norms were designed around. You can still be sensitive, or have quirks all your own.',
      relate: 'Busy rooms, group chats and classroom-style learning mostly feel manageable.' },
    { id: 'adhd', label: 'ADHD', desc: 'Fast, interest-driven, sometimes all at once.',
      about: 'Attention runs on interest and urgency more than importance. It often comes with quick thinking, restlessness, losing track of time and big feelings.',
      relate: 'You hyperfocus on what grabs you but struggle to start dull tasks, lose track of time, or have a dozen thoughts going at once.' },
    { id: 'autistic', label: 'Autistic', desc: 'Deep focus, direct talk, sensory differences.',
      about: 'A different way of processing the world, often with deep focus, strong pattern-sensing, sensory differences, and a preference for direct words and predictability.',
      relate: 'Unwritten social rules feel confusing or tiring, noise or textures hit hard, or routines and deep interests feel like home.' },
    { id: 'dyslexic', label: 'Dyslexic', desc: 'Big-picture, visual, better out loud than on paper.',
      about: 'Reading, spelling and processing written words take extra effort, often alongside strong big-picture, visual or creative thinking.',
      relate: 'Reading drains you, words blur or jump, spelling feels random, or you explain things far better out loud.' },
    { id: 'sensitive', label: 'Highly sensitive', desc: 'Feels sound, mood and stress strongly.',
      about: 'A temperament, not a diagnosis: your nervous system takes in and processes more of everything, from sounds and moods to beauty and stress.',
      relate: 'You notice small details, feel worn out by crowded places, and are deeply moved by other people’s feelings.' },
    { id: 'unsure', label: 'Not sure yet', desc: 'Show me options from every wiring type.',
      about: 'Still figuring it out is a perfectly good answer. You’ll see options from every wiring type, so you can notice which ones feel like you.',
      relate: 'Some of the descriptions here feel familiar, but you’re not sure which.' },
    { id: 'other', label: 'Something else', desc: 'My wiring isn’t listed here.',
      about: 'Dyspraxia, dyscalculia, Tourette’s, OCD, anxiety and many other kinds of wiring shape how people think and talk. You can name yours, and open options from every type along the way.',
      relate: 'You know your wiring, and it isn’t one of the above.' }
  ];
  const BANK_NAMES = { general: 'Common for lots of people', adhd: 'Often shared by ADHD folks', autistic: 'Often shared by Autistic folks', dyslexic: 'Often shared by Dyslexic folks', sensitive: 'Often shared by highly sensitive folks' };
  const BANKS = ['general', 'adhd', 'autistic', 'dyslexic', 'sensitive'];

  /* ---------- the parts ---------- */
  const SECTIONS = [
    { id: 'pace', axis: 0, title: 'How my brain gets going', lede: 'Pace: how quickly thoughts form, and how you handle shifts.',
      qs: [
        { q: 'Someone asks you a big question. You…', a: 'Answer right away and figure it out as I talk', b: 'Need a moment, or a day, to think first' },
        { q: 'Your thoughts usually feel like…', a: 'Popcorn: lots popping at once', b: 'A slow cooker: one thing, simmering deep' },
        { q: 'A sudden change of plans feels…', a: 'Fine, maybe even fun', b: 'Jarring. I need a heads-up or a transition' }],
      chips: {
        general: [['I think best by talking it out', 1], ['I like to sleep on big decisions', -1], ['My energy changes a lot through the day', 0]],
        adhd: [['My brain has a dozen tabs open', 1], ['Interest switches my focus on like a light', 1], ['“Five minutes” is a guess for me: time slips away', 0], ['I interrupt because the thought will vanish, not because I’m not listening', 1], ['Getting started is the hardest part', 0]],
        autistic: [['I need processing time before I can answer', -1], ['Sudden plan changes cost me a lot of energy', -1], ['I go deep on one thing at a time', -1], ['Transitions go better with a heads-up', -1], ['When I’m overloaded, my words can go offline', 0]],
        dyslexic: [['I think in pictures or stories more than words', 0], ['Reading long messages takes extra energy', 0], ['I’m faster out loud than in writing', 1], ['My mind jumps to the answer before the steps', 1]],
        sensitive: [['Noise or clutter slows my thinking down', -1], ['I notice a lot at once, then need quiet to sort it', -1], ['Busy days leave me needing real recovery time', 0]] } },
    { id: 'lens', axis: 1, title: 'How I think things through', lede: 'Lens: the big picture first, or the details first.',
      qs: [
        { q: 'Starting something new, you want…', a: 'The why and the big vision', b: 'The first concrete step' },
        { q: 'Instructions work best as…', a: 'A quick overview. I’ll fill in the gaps', b: 'Clear steps, in order' },
        { q: 'You tend to notice…', a: 'Patterns and how things connect', b: 'Specific details other people miss' }],
      chips: {
        general: [['I connect ideas that seem unrelated', 1], ['I like the plan written down', -1], ['I learn by doing more than reading', 0]],
        adhd: [['I see the whole picture fast, but lose the middle steps', 1], ['New ideas light me up; routine drains me', 1], ['I need it chunked into small, visible steps', -1], ['Out of sight really is out of mind', 0]],
        autistic: [['I notice details and patterns others overlook', -1], ['I like knowing the exact rules and reasons', -1], ['I think in systems: how all the parts fit', 1], ['Vague plans make me uneasy', -1], ['I think most clearly inside my special interests', 0]],
        dyslexic: [['I’m a big-picture, 3D thinker', 1], ['I solve problems in creative, unexpected ways', 1], ['Diagrams and examples beat paragraphs', 0], ['Long written steps blur together for me', 0]],
        sensitive: [['I think deeply before I act', 0], ['I pick up on small details in a room or a person', -1], ['I weigh how a choice will affect everyone', 1]] } },
    { id: 'send', axis: 2, title: 'How I communicate out', lede: 'Sending: how you share what’s on your mind.',
      qs: [
        { q: 'When something bothers you, you usually…', a: 'Say it plainly so we can fix it', b: 'Hint at it, or wait for the right moment' },
        { q: 'Giving feedback, you…', a: 'Get to the point. Honesty is kindness', b: 'Cushion it so it lands gently' },
        { q: 'Your texts tend to be…', a: 'Short and to the point', b: 'Warm, with softeners and emoji' }],
      chips: {
        general: [['I say what I mean and mean what I say', 1], ['I soften things so no one gets hurt', -1], ['I share feelings more easily in writing', 0]],
        adhd: [['I info-dump when I’m excited', 0], ['I share my own story to show I relate, not to make it about me', 0], ['I forget to reply, but I do care', 0], ['I talk fast and jump between topics', 0]],
        autistic: [['I’m direct. It isn’t rude, it’s clear', 1], ['My face may not show feelings the way people expect', 0], ['Eye contact can make it harder to talk', 0], ['Info-dumping about things I love is me sharing', 0], ['Scripts help me say hard things', 0]],
        dyslexic: [['I’d rather call or send a voice note than type', 0], ['My spelling isn’t a measure of my effort', 0], ['I explain best with examples or a sketch', 0]],
        sensitive: [['I choose my words very carefully', -1], ['I avoid conflict, sometimes for too long', -1], ['I need to calm down before I can talk it through', 0]] } },
    { id: 'recv', axis: 3, title: 'How I take things in', lede: 'Receiving: what helps a message land the way it was meant.',
      qs: [
        { q: 'Someone says “I’m fine.” You…', a: 'Believe them. Fine means fine', b: 'Check their tone to see if they really are' },
        { q: 'Feedback is easiest to hear when it’s…', a: 'Clear and specific, even if blunt', b: 'Delivered warmly. Tone matters a lot' },
        { q: 'Hints and sarcasm…', a: 'Often fly past me, or wear me out', b: 'I usually catch them' }],
      chips: {
        general: [['Please say it directly. I won’t guess right', 1], ['How you say it matters as much as what you say', -1], ['I need a moment before responding to hard news', 0]],
        adhd: [['Criticism can hit hard and fast', -1], ['Give me the headline first, then the details', 1], ['Reminders help me. They aren’t nagging', 0], ['Write it down or I may not remember it', 1]],
        autistic: [['I take words literally', 1], ['Hints and implied meaning are hard to catch', 1], ['Tone of voice can be hard for me to read', 1], ['Written follow-ups help me process', 1], ['Too much at once overloads me', 0]],
        dyslexic: [['Tell me out loud rather than in a long text', 0], ['Short lists beat paragraphs', 1], ['Give me time to read without pressure', 0]],
        sensitive: [['I pick up on moods quickly, even unspoken ones', -1], ['A harsh tone can stay with me for days', -1], ['I feel other people’s stress like my own', -1]] } },
    { id: 'inputs', axis: null, custom: 'inputs', title: 'How I take things in and learn', lede: 'Everyone takes in the world through several inputs. Tap every one that helps things click for you, then pick your strongest.', qs: [], chips: {} },
    { id: 'helps', axis: null, title: 'What helps me feel understood', lede: 'Pick anything that makes connection easier for you. These go straight into your profile.', qs: [],
      chips: {
        general: [['A heads-up before big changes', 0], ['Telling me what you need, plainly', 0], ['Appreciation said out loud', 0], ['Time alone to recharge', 0]],
        adhd: [['Doing tasks side by side (body doubling)', 0], ['Gentle reminders without blame', 0], ['Help breaking big tasks into steps', 0], ['Patience when I lose track of time', 0]],
        autistic: [['Plans shared in advance', 0], ['Quiet, low-sensory places to talk', 0], ['Clear, literal language', 0], ['Room to stim or step away', 0], ['Texting instead of calling', 0]],
        dyslexic: [['Voice notes or calls instead of long texts', 0], ['Visuals, lists and examples', 0], ['No judgment about spelling or reading pace', 0]],
        sensitive: [['A soft voice during hard talks', 0], ['Downtime after busy days', 0], ['Reassurance when things feel tense', 0]] } },
    { id: 'statement', axis: null, custom: 'statement', title: 'Your statement', lede: '', qs: [], chips: {} }
  ];
  const TOTAL = SECTIONS.length;          // parts are steps 2..TOTAL+1; results come after
  const RESULTS = TOTAL + 2;

  /* ---------- the Wave Code ---------- */
  const LETTERS = {
    Q: { name: 'Quick Spark', axis: 'Pace', what: 'Thinks fast and out loud. Ideas show up mid-sentence, and talking is part of thinking.', gift: 'Energy, momentum and great brainstorming.', watch: 'committing before the slower parts of you catch up', tune: 'Let them think aloud without treating every idea as a final answer. If you need time, say “let me think and get back to you.”' },
    S: { name: 'Slow Simmer', axis: 'Pace', what: 'Processes inside before speaking. The first answer isn’t always the best one; the good thoughts arrive later.', gift: 'Depth, steadiness and well-considered decisions.', watch: 'agreeing in the moment just to fill the silence', tune: 'Give a heads-up before big talks, and accept “I need time to think” as a real answer, not avoidance.' },
    F: { name: 'Forest', axis: 'Lens', what: 'Sees the big picture first: patterns, purpose and how everything connects.', gift: 'Vision and creative problem-solving.', watch: 'skipping the middle steps on the way to the vision', tune: 'Start with the why. Then help with the steps without making them feel scattered.' },
    T: { name: 'Trees', axis: 'Lens', what: 'Starts with the specifics: steps, facts and exact details.', gift: 'Precision, follow-through and noticing what others miss.', watch: 'getting stuck when a plan stays vague', tune: 'Be concrete. “Sometime soon” means far less to them than “Saturday at 10.”' },
    D: { name: 'Direct', axis: 'Sending', what: 'Says it plainly. Honesty is how they show respect.', gift: 'Clarity, and no guessing games.', watch: 'landing harder than you mean to', tune: 'Listen to the words, not an imagined tone. Bluntness usually isn’t anger.' },
    N: { name: 'Nuanced', axis: 'Sending', what: 'Cushions what they say and reads the moment. May hint before saying it outright.', gift: 'Tact, warmth and keeping the peace.', watch: 'your real needs getting lost in the cushioning', tune: 'Make it safe to be direct. Ask “is there something you’d like from me?” and take soft hints seriously.' },
    E: { name: 'Explicit', axis: 'Receiving', what: 'Takes words at face value and wants things spelled out.', gift: 'Clear agreements and fewer misunderstandings.', watch: 'missing the hint someone was counting on you to catch', tune: 'Say exactly what you mean. Don’t count on hints, sarcasm or tone to carry the message.' },
    A: { name: 'Attuned', axis: 'Receiving', what: 'Reads tone, mood and subtext, sometimes even more than the words.', gift: 'Empathy, and noticing when something is off.', watch: 'taking on a tone that wasn’t about you', tune: 'Mind your tone, and say so when you’re stressed about something else, so they don’t take it personally.' }
  };
  const AXES = [['Q', 'S'], ['F', 'T'], ['D', 'N'], ['E', 'A']];
  const AXIS_NAMES = ['Pace', 'Lens', 'Sending', 'Receiving'];
  const ARCHETYPES = {
    QFDE: ['The Comet', 'Fast, visionary and straight-talking. Wants the same honesty back.'],
    QFDA: ['The Sunflare', 'Bursting with big ideas and blunt about them, yet feels every shift in tone.'],
    QFNE: ['The Kite', 'Quick, imaginative and gentle with words. Needs things said plainly in return.'],
    QFNA: ['The Firefly', 'Bright, warm, full of ideas, and quick to sense how others feel.'],
    QTDE: ['The Hummingbird', 'Fast, precise and to the point. Clear in, clear out.'],
    QTDA: ['The Spark Plug', 'Gets things moving and says what’s needed, but tone lands deep.'],
    QTNE: ['The Bumblebee', 'Busy, practical and kind in delivery. Likes instructions spelled out.'],
    QTNA: ['The Otter', 'Quick, hands-on, playful, and always reading the room.'],
    SFDE: ['The Owl', 'Thinks long and deep, speaks plainly, and takes words at face value.'],
    SFDA: ['The Lighthouse', 'Steady, far-seeing and honest, with a keen sense for the mood around them.'],
    SFNE: ['The Tide', 'Slow and deep, gentle in delivery, and grateful for clear, direct words.'],
    SFNA: ['The Willow', 'Reflective and soft-spoken. Feels the undercurrents of every room.'],
    STDE: ['The Compass', 'Steady, exact and direct. Wants clear words and clear plans.'],
    STDA: ['The Oak', 'Steady and practical, honest in what they say, sensitive to how it’s said back.'],
    STNE: ['The Hearth', 'Calm, careful and kind. Does best when expectations are spelled out.'],
    STNA: ['The Quilt', 'Patient, detail-minded and gentle. Stitches people together by noticing everything.']
  };
  const PAIR_TIPS = [
    'One of you thinks out loud and one thinks inside. The Quick Spark can say “I’m just brainstorming,” and the Slow Simmer can say “I’ll come back to this by tonight.”',
    'Forest wants the why; Trees wants the how. Start with the big picture, then agree on the first concrete step together.',
    'Direct can sound harsh to Nuanced, and Nuanced can sound vague to Direct. Agree that plain words aren’t anger, and soft words still count.',
    'Explicit needs it spelled out; Attuned hears the tone first. Say what you mean, and say it kindly. Here, both matter.'
  ];

  /* ---------- the nine inputs of learning ---------- */
  const INPUTS = [
    { id: 'words', icon: '💬', name: 'Words', g: 'Linguistic', short: 'Talking, reading, writing and stories.',
      how: 'You understand things best once they’re put into words: talked through, read, written down or told as a story.',
      send: 'Put it into words. A clear sentence, a short note or a story beats a hint or a look.',
      intro: ['Some people don’t really know what they think until they’ve said it or written it. Words are how they sort, store and share the world.', 'In relationships, words-first people often need things said out loud. Actions matter to them, but an unspoken feeling can feel like no feeling at all.'],
      prompts: ['Do you understand yourself better by talking, writing or reading? Which one?', 'What’s a sentence someone said to you that you still remember? Why did it stick?', 'What would you like someone close to you to say out loud more often?'],
      tryThis: 'Write a three-line note to someone you care about: one fact, one feeling, one thank-you. Hand it over or leave it where they’ll find it.',
      fit: { dyslexic: 'Many Dyslexic people are strong with spoken words and stories even when reading is tiring. Voice notes and conversation can be your best version of this input.', autistic: 'Many Autistic people care about exact wording. Saying precisely what you mean is a strength here, not pickiness.' } },
    { id: 'logic', icon: '🔢', name: 'Logic and numbers', g: 'Logical-mathematical', short: 'Reasons, rules, numbers and how things work.',
      how: 'You learn by understanding why: the reasons, the rules, cause and effect. Numbers and systems feel steadying.',
      send: 'Give the reason and the facts. A clear “because” and real numbers land better than feelings alone.',
      intro: ['For logic-first people, something isn’t fully learned until it makes sense. They want the why, the rule and the steps that connect A to B.', 'In relationships, this input can look cold from the outside, but it’s often care in disguise. Solving the problem is how many logic-first people say “I love you.”'],
      prompts: ['When something upsets you, do you need to understand it before you can feel it? What happens if you can’t?', 'When has a clear number or fact calmed a disagreement for you?', 'Where might someone read your problem-solving as not caring, when you meant the opposite?'],
      tryThis: 'Write down who did what at home for one week with the Lemonade Stand. Notice whether seeing real numbers changes how the topic feels.', link: ['The Lemonade Stand', '/lemonade-stand.html'],
      fit: { autistic: 'Many Autistic people think in systems and rules. Knowing the exact reasons can turn worry into calm.', adhd: 'Many ADHD folks love solving a puzzle but stall on repetitive steps. Turning a chore into a system or a game can help.' } },
    { id: 'pictures', icon: '🖼️', name: 'Pictures and space', g: 'Visual-spatial', short: 'Images, diagrams, color, maps and where things are.',
      how: 'You think in pictures. Diagrams, colors, maps and seeing where things are make ideas click.',
      send: 'Show it. Sketch it, map it, or use a picture or visible list instead of a long explanation.',
      intro: ['Visual-spatial people often see an idea before they can explain it. A messy explanation turns clear the moment someone draws a box and an arrow.', 'In relationships, this input notices a lot: a tidy room, a new haircut, a face that doesn’t match the words. It also means visual clutter can be genuinely draining.'],
      prompts: ['What’s something you only understood once you saw it drawn or shown?', 'How does the look of your home affect your mood?', 'If you drew your week as a picture, what would it look like?'],
      tryThis: 'Next time you plan something with someone, sketch it together on paper: a calendar block, a map, or boxes and arrows. Notice if it ends faster.',
      fit: { dyslexic: 'Many Dyslexic people are strong visual and 3D thinkers. Diagrams often beat paragraphs.', adhd: 'Out of sight is out of mind for many ADHD folks, so visible lists and whiteboards can do the remembering for you.' } },
    { id: 'body', icon: '🤲', name: 'Hands and movement', g: 'Bodily-kinesthetic', short: 'Doing, touching, moving and making.',
      how: 'You learn by doing. Something makes sense once your hands and body have tried it.',
      send: 'Show it by doing it side by side. A hug, a walk-and-talk, or helping with the task says more than a speech.',
      intro: ['Some people learn by reading the manual. Body-first people learn by taking the thing apart. Movement isn’t a distraction for them; it’s how thinking happens.', 'In relationships, care often shows up as actions: fixing, carrying, cooking, a hand on the back. When those actions go unseen, it can feel like the care itself went unseen.'],
      prompts: ['Where do you feel stress first in your body?', 'What do you understand better after doing it once than after hearing it ten times?', 'How do you show care through actions? Does the other person notice?'],
      tryThis: 'Have one hard conversation this week while walking side by side instead of sitting face to face. Notice the difference.',
      fit: { adhd: 'Many ADHD folks think better while moving. Fidgeting, pacing or a walk can help you listen, not distract you.', autistic: 'For many Autistic people, stimming is a body-first way of settling. It helps you stay present.' } },
    { id: 'sound', icon: '🎵', name: 'Sound and rhythm', g: 'Musical', short: 'Tone, music, rhythm and how things sound.',
      how: 'You pick up tone, rhythm and sound. How something is said can matter as much as what’s said.',
      send: 'Mind your tone. Say it calmly, out loud rather than in text when you can, and keep the pace steady.',
      intro: ['Sound-first people hear the music under the words: the tone, the pace, the pause. A song can change their whole state in a minute.', 'In relationships, this input is often the first to notice when something’s off, and the first to be overwhelmed by a loud or chaotic room.'],
      prompts: ['Which sounds calm you down, and which ones wear you out?', 'When has someone’s tone mattered more to you than their words?', 'Is there a song or sound that means “us” or “safe” to you?'],
      tryThis: 'Choose one sound together, like a song or a soft background track, that means “let’s pause and come back to this.” Use it once this week.', link: ['Brain Breakers', '/soundscapes.html'],
      fit: { sensitive: 'Highly sensitive people often hear everything: hums, clicks, sharp tones. Noticing which sounds cost you the most is a good first step.', autistic: 'Many Autistic people are sensitive to sound. A quiet space can be a need, not just a preference.', adhd: 'Music or background noise helps many ADHD folks focus and get started.' } },
    { id: 'people', icon: '🤝', name: 'People', g: 'Interpersonal', short: 'Learning with others and reading how they feel.',
      how: 'You learn through other people: discussing, working together and reading how others feel.',
      send: 'Do it together. Ask questions, think out loud with them, and check how it’s landing.',
      intro: ['People-first learners light up in conversation. An idea becomes real once they’ve bounced it off someone.', 'In relationships, this input is a gift for empathy and teamwork. It can also mean carrying everyone else’s mood, which is a quiet kind of unseen work.'],
      prompts: ['Who do you think most clearly with? What do they do that helps?', 'When do you end up managing other people’s feelings more than your own?', 'What do you wish people would ask you more often?'],
      tryThis: 'Ask someone close to you one real question this week, then only listen: “What’s been heavy for you lately?”', link: ['Turning toward', '/turning-toward.html'],
      fit: { sensitive: 'Highly sensitive people often absorb other people’s moods. Notice which feelings are yours and which you picked up.', autistic: 'Many Autistic people connect deeply one-on-one or through shared interests, even when group chatter drains them.' } },
    { id: 'self', icon: '🌙', name: 'Inner reflection', g: 'Intrapersonal', short: 'Quiet thinking, journaling and knowing yourself.',
      how: 'You learn by turning inward. You need quiet time to think, feel and connect new ideas to yourself.',
      send: 'Give time and space. Share it ahead of time, let them think, and don’t expect an instant answer.',
      intro: ['Reflection-first people process inside. They may seem quiet in the moment, then come back hours later with the clearest thought in the room.', 'In relationships, this input brings deep self-awareness, but it can be misread as distance. Time alone is often how they come back more present.'],
      prompts: ['Where and when do your clearest thoughts show up?', 'What do you know about yourself now that you didn’t five years ago?', 'How do you let people know you need time to think, without them feeling shut out?'],
      tryThis: 'Spend ten quiet minutes with one journal prompt from these chapters. Then share one sentence of what you found with someone you trust.',
      fit: { autistic: 'Many Autistic people need processing time and time alone to recharge. That’s looking after yourself, not pulling away.', sensitive: 'Highly sensitive people often reflect deeply. Downtime is how the day gets digested.' } },
    { id: 'nature', icon: '🌿', name: 'Nature and patterns', g: 'Naturalist', short: 'Noticing, sorting and reading environments.',
      how: 'You learn by noticing and sorting: patterns, categories, living things and how a whole environment works.',
      send: 'Set the scene. Pick a calm place, and connect the idea to real examples from the world around you.',
      intro: ['Naturalist learners are noticers and sorters. They spot the bird, the pattern, the thing that’s out of place, and they learn by grouping things and seeing how a whole system lives.', 'In relationships, this input reads environments. The mood of a room, the rhythm of a household and the seasons of a relationship all register strongly.'],
      prompts: ['What environment helps you feel most like yourself?', 'What patterns do you notice in your household that others miss?', 'What season is your relationship, or your life, in right now?'],
      tryThis: 'Have one conversation outside this week, or in the calmest room you have, and notice how the setting changes it.', link: ['Check-ins: a good time and place', '/check-ins.html'],
      fit: { autistic: 'Many Autistic people are strong pattern-spotters and sorters. Sorting things can be soothing.', sensitive: 'Highly sensitive people often feel environments intensely, so where a hard talk happens really matters.' } },
    { id: 'meaning', icon: '✨', name: 'Big questions and meaning', g: 'Existential', short: 'Purpose, values and the why behind everything.',
      how: 'You learn when something connects to meaning: values, purpose and the bigger questions about life.',
      send: 'Connect it to why it matters: your shared values, your future, and what you’re building together.',
      intro: ['Meaning-first people need to know how something fits into the bigger story. A task with no purpose feels heavy; the same task tied to a value feels light.', 'In relationships, this input asks “what are we building?” and can feel lonely when daily life is all logistics and no meaning.'],
      prompts: ['What three values would you want your home to be known for?', 'When did a small, ordinary task suddenly feel meaningful?', 'What question about life have you been carrying lately?'],
      tryThis: 'Share one value with someone close to you, and connect one weekly chore to it: “I cook because feeding us is how I show we matter.”',
      fit: { adhd: 'Many ADHD folks find it far easier to do what feels meaningful. Linking a dull task to its why can help you start.', sensitive: 'Highly sensitive people often think deeply about meaning and are moved by beauty and big ideas.' } }
  ];
  const IN = {}; INPUTS.forEach(x => { IN[x.id] = x; });

  /* ---------- the statement (formerly Your Heartprint) ---------- */
  const STEPS = [
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
    { id: 'fills', t: 'What fills me up', q: 'What leaves you feeling more like yourself?', lead: 'What fills me up: ', join: 'and', list: true,
      o: [['outside', 'Time outside', 'time outside'], ['music', 'Music', 'music'], ['quiet', 'Quiet time', 'quiet time'], ['move', 'Moving my body', 'moving my body'],
        ['talk', 'Talking it through', 'talking things through'], ['make', 'Making things', 'making something with my hands'], ['sleep', 'A good night’s sleep', 'a good night’s sleep'],
        ['pets', 'Time with pets', 'time with animals'], ['together', 'Time together, no agenda', 'unhurried time together'], ['order', 'A tidy space', 'a tidy space'], ['laugh', 'Laughing', 'a good laugh']] },
    { id: 'drains', t: 'What drains me', q: 'What wears you down faster than people might guess?', lead: 'What drains me: ', join: 'and', list: true,
      o: [['change', 'Last-minute changes', 'last-minute changes'], ['clutter', 'Clutter', 'clutter'], ['openconflict', 'Conflict left hanging', 'a disagreement left hanging'],
        ['interrupt', 'Being interrupted', 'being interrupted'], ['messages', 'Too many messages', 'a flood of messages'], ['vague', 'Plans that stay vague', 'plans that stay vague'],
        ['unseen', 'Feeling unseen', 'feeling that my effort goes unseen'], ['rushed', 'Being rushed', 'being rushed'], ['noise', 'Noise and busy places', 'noise and busy places'], ['alonetoo', 'Too much time alone', 'too much time alone']] },
    { id: 'stretched', t: 'When I’m stretched, you might notice', q: 'When your energy runs low, what do people see on the outside?', lead: 'When I’m stretched, you might notice that ', join: 'or',
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
  // connections you might not have noticed: every [step, choice] in `when` must be picked ('*' = anything in that step)
  const F = { ps: 'Psychology', ph: 'Philosophy', bs: 'Behavioral science', nb: 'Neurobiology', ec: 'Economics', bu: 'Business', fi: 'Finance', ht: 'Holistic practice', ar: 'The senses' };
  const PIL = { 1: ['Pillar I, See the whole load', 'see-the-load'], 2: ['Pillar II, Fix the setup, not the person', 'fix-the-setup'], 3: ['Pillar III, Read your state first', 'read-your-state'],
    4: ['Pillar IV, Tune how you send and receive', 'tune-signals'], 5: ['Pillar V, Notice the quiet incentives', 'quiet-incentives'] };
  const INSIGHTS = [
    { when: [['wired', 'alone'], ['stretched', 'quiet']], f: 'ps', p: 4, t: 'Your quiet can be read as being upset with someone.', d: 'If you recharge alone and go quiet when stretched, the people around you may guess it’s about them. One line in your statement, “When I go quiet, I’m recharging, not upset with you,” saves a lot of guessing.', l: ['Wired Differently', '/wired-differently.html'] },
    { when: [['wired', 'direct']], f: 'ps', p: 4, t: 'Direct words can land harder than you mean them.', d: 'People who say things straight are often heard as sharper than they intend, especially by people who hint. Adding a softener or a reason (“because I want to get this right”) keeps your meaning and lowers the static.', l: ['The Signal Translator', '/signal-translator.html'] },
    { when: [['wired', 'hint']], f: 'ps', p: 4, t: 'Hints can go unheard, then turn into disappointment.', d: 'If you tend to hint, a literal listener may miss it completely, and you may feel let down by someone who never knew. Try saying one plain ask, out loud, once.', l: ['Say it so it lands (WP-09)', '/workpapers/wp-09-say-it-so-it-lands.html'] },
    { when: [['wired', 'thinkfirst'], ['drains', 'openconflict']], f: 'bs', p: 3, t: 'You need time to answer, and you hate leaving things open.', d: 'Those two pull against each other. The answer is a named time: “Can I think about it and come back to you at eight?” It gives you room without leaving the disagreement hanging.', l: ['Chapter III: later, not never', '/book/chapter-3.html'] },
    { when: [['wired', 'thinkloud']], f: 'ps', p: 4, t: 'Thinking out loud can sound like deciding.', d: 'When you process by talking, others may take a half-formed idea as a firm plan, or as criticism. A quick “I’m thinking out loud here” changes how every sentence after it is heard.', l: ['Chapter I: what was meant and what was heard', '/book/chapter-1.html'] },
    { when: [['wired', 'plans'], ['drains', 'change']], f: 'nb', p: 3, t: 'A heads-up can turn a change from a jolt into a shrug.', d: 'For a planner, a sudden change isn’t just inconvenient; it lands in the body first. Asking for even ten minutes’ warning, by name, is a small request with a big effect.', l: ['Today’s Weather', '/quick-checks.html#today'] },
    { when: [['wired', 'senses']], f: 'ar', p: 3, t: 'Where and when you talk is part of the conversation.', d: 'If noise, light or crowds wear you out, a hard talk in a busy room starts with your energy already low. Suggest a quiet place and a calm time for anything important.', l: ['Chapter IV: giving a comment time to land', '/book/chapter-4.html'] },
    { when: [['drains', 'noise']], f: 'ar', p: 3, t: 'Busy places use up your energy before anyone says a word.', d: 'Leaving room to settle after a crowded day (even ten quiet minutes) can make the evening feel completely different.', l: ['Breathe or the Night Garden', '/night-garden.html'] },
    { when: [['stretched', 'short'], ['now', 'busy']], f: 'nb', p: 3, t: 'Some of the snap may be leftover stress, not this moment.', d: 'A busy season fills your stress tank before you get home. A reaction three sizes too big is often leftover stress meeting a small moment. Saying “Heads up, I’m carrying a lot today” changes how everything after it lands.', l: ['Chapter III: full tanks', '/book/chapter-3.html'] },
    { when: [['stretched', 'hide']], f: 'ps', p: 3, t: 'If you hide it well, people can’t help in time.', d: 'Hiding stress is a skill, and it has a cost: the people who’d gladly help don’t know you need it until you’re running on empty. A simple number for how full your stress tank is (“I’m at about 7 out of 10 today”) lets them see what you don’t show.', l: ['How much are you carrying? (WP-02)', '/workpapers/wp-02-how-much-are-you-carrying.html'] },
    { when: [['stretched', 'plan']], f: 'bs', p: 2, t: 'Over-planning can be stress in disguise.', d: 'When things feel out of control, making lists can feel like the only lever. It helps to notice which plans are needed and which are a way of calming down, so others don’t feel managed.', l: ['Chapter II: is the split working?', '/book/chapter-2.html'] },
    { when: [['care', 'doing'], ['drains', 'unseen']], f: 'ps', p: 1, t: 'Care that comes out as doing is the easiest to miss.', d: 'If you show love by doing things, someone who looks for words or time may not see it as care at all, and you may feel unseen. Naming it helps: “When I sort the car out, that’s me looking after you.”', l: ['Turning Toward', '/turning-toward.html'] },
    { when: [['care', 'remember']], f: 'ec', p: 1, t: 'Remembering is real work, even when it looks like nothing.', d: 'Remembering the details people care about is a gift, and it’s also the kind of unseen work that adds up. It counts, and it’s fair to say so.', l: ['The Preface: unbilled debt', '/book/preface.html'] },
    { when: [['unseen', 'dates']], f: 'fi', p: 1, t: 'That’s unbilled debt.', d: 'Remembering dates and appointments is work that gets done but never written down. Over months, it builds up like a debt only one person can see. Writing down one week of it with Who did what (WP-01) often surprises everyone.', l: ['Who did what (WP-01)', '/workpapers/wp-01.html'] },
    { when: [['unseen', 'lowon']], f: 'bu', p: 5, t: 'Jobs drift to whoever notices first.', d: 'If you’re the one who notices what’s running low, the job of noticing has probably become yours by default, without anyone deciding it. Giving it a named owner (even if that’s still you) makes it visible.', l: ['One owner per job (WP-03)', '/workpapers/wp-03-one-owner-per-job.html'] },
    { when: [['unseen', 'peace']], f: 'ps', p: 1, t: 'Keeping the peace is work, too.', d: 'Smoothing things over and steering conversations somewhere calmer takes real energy, and it usually goes unthanked because when it works, nothing seems to happen.', l: ['The kinds of unseen work', '/book/preface-in-depth.html'] },
    { when: [['unseen', 'mood']], f: 'nb', p: 3, t: 'Reading the room all day can fill your stress tank quietly.', d: 'If you’re always tracking how everyone else feels, your own state can slip off the list. Checking in with yourself first isn’t selfish; it’s how you keep reading the room well.', l: ['Today’s Weather', '/quick-checks.html#today'] },
    { when: [['values', 'fair'], ['unseen', '*']], f: 'ec', p: 1, t: 'Fairness starts with seeing the whole load.', d: 'If fairness matters to you and some of your work goes unseen, a shared page of who does what is the kindest first step. Facts on one page calm this conversation down fast.', l: ['The Lemonade Stand', '/lemonade-stand.html'] },
    { when: [['now', 'caring']], f: 'ht', p: 3, t: 'People who care for others often stop counting their own needs.', d: 'Pick one thing from “What fills me up” and give it a real time this week, written down like any other appointment.', l: ['Caring for someone', '/relationships-in-depth.html'] },
    { when: [['now', 'kids'], ['unseen', '*']], f: 'bu', p: 2, t: 'Family logistics run like a small business.', d: 'School forms, lunches and birthday gifts are recurring jobs. Each one runs better with one named owner than with “whoever remembers.”', l: ['One owner per job (WP-03)', '/workpapers/wp-03-one-owner-per-job.html'] },
    { when: [['helps', 'spacetime']], f: 'bs', p: 3, t: 'Space works best with a time to come back.', d: '“I need a break” can sound like leaving. “I need twenty minutes, then let’s talk at eight” sounds like caring about the conversation. The time is what makes space feel safe for both of you.', l: ['The Calm-Down Kit (WP-11)', '/wp-11.html'] },
    { when: [['helps', 'written']], f: 'ps', p: 4, t: 'Writing can say what a face-to-face talk can’t.', d: 'Some people find hard things easier to say and hear in writing: there’s time to think, and no tone of voice to misread. Saying so in your statement lets people offer it.', l: ['The Signal Translator', '/signal-translator.html'] },
    { when: [['wired', 'fast'], ['wired', 'slow']], f: 'ph', p: 4, t: 'You move fast and slow.', d: 'Many people do: fast at some things, slow at others. Naming which is which helps others match your pace, instead of guessing.', l: ['Chapter I: what sets the frequency', '/book/chapter-1-in-depth.html'] },
    { when: [['fills', 'quiet'], ['now', 'kids']], f: 'ht', p: 3, t: 'Quiet may be the rarest thing in your week.', d: 'With kids at home, quiet doesn’t happen by accident. Agreeing on even fifteen protected minutes, and swapping turns, is a setup fix, not a luxury.', l: ['Fix the setup, not the person', '/five-pillars.html#fix-the-setup'] },
    { when: [['values', 'reliable'], ['stretched', 'hide']], f: 'ph', p: 2, t: 'Being reliable and hiding stress can wear each other out.', d: 'If being someone people can count on matters to you, saying “not this week” can feel like failing. But an honest “not right now, I’ll do it Thursday” is still being reliable.', l: ['Kind ways to say no (WP-01)', '/workpapers/wp-01.html'] },
    { when: [['drains', 'messages']], f: 'bs', p: 2, t: 'A flood of messages is a setup problem.', d: 'Agreeing on one place and one time for household logistics (a shared list, or a short catch-up on Sundays) can quiet the stream without anyone feeling ignored.', l: ['Check-ins', '/check-ins.html'] },
    { when: [['wired', 'details'], ['unseen', '*']], f: 'ec', p: 5, t: 'Noticing details is a gift that quietly becomes a job.', d: 'When you see what others miss, you end up handling it. That’s a quiet incentive at work: the setup rewards whoever notices first.', l: ['Notice the quiet incentives', '/five-pillars.html#quiet-incentives'] }
  ];

  /* ---------- self-discovery chapters ---------- */
  const NT_ENERGY = {
    adhd: 'Many ADHD folks recharge through novelty, movement and interest, and drain fast on boring-but-necessary tasks. Low energy for chores isn’t laziness. It’s a brain that runs on interest.',
    autistic: 'Many Autistic people drain from social demands, noise and unpredictability, and recharge through time alone, routine and special interests. Long stretches of pushing through can leave you running on empty.',
    dyslexic: 'Many Dyslexic folks spend extra effort on reading and writing all day, so they can be more tired by evening than anyone realizes.',
    sensitive: 'Highly sensitive people take in more of everything, so busy, loud days cost more and need real recovery.',
    general: 'Every brain has its own pattern of what fills it up and what drains it, labeled or not. Learning yours stops you from treating tiredness like a moral failing.'
  };
  const NT_MASK = {
    adhd: 'ADHD masking often looks like over-preparing, over-apologizing, or working twice as hard to look “together.”',
    autistic: 'Autistic masking can include scripting conversations, copying other people’s expressions and hiding stims. Unmasking slowly, in safe places, is part of self-discovery for many.',
    dyslexic: 'Many Dyslexic people learned to hide reading struggles, dodge reading aloud, or carry old school labels that never fit.',
    sensitive: 'Sensitive people often learn to hide how much they feel so they’ll seem easygoing.',
    general: 'Family scripts shape everyone: what “normal” looked like in the home you grew up in, and which parts of you got praised or hushed.'
  };
  const CHAPTERS = [
    { id: 'pace', title: 'Meeting your own speed', sub: 'Your pace, and building days around it',
      intro: ['Most of us learned early whether our speed was “right.” Fast thinkers were told to slow down and wait their turn. Slow thinkers were told to keep up.', 'Neither speed is a flaw. This chapter is about noticing your natural pace and building your days around it instead of against it.'],
      yours: c => c[0] === 'Q'
        ? 'As a Quick Spark, your thinking often happens out loud and in motion. The risk isn’t that you’re too much. It’s that others may treat your brainstorms as decisions, or that you commit before the slower parts of you catch up.'
        : 'As a Slow Simmer, your best thoughts often arrive after the conversation ends. The risk isn’t that you’re behind. It’s agreeing to things in the moment just to fill the silence, then quietly disagreeing later.',
      prompts: () => ['When were you last told to speed up or slow down? How did it feel?', 'When does thinking feel easiest for you: what time of day, place or situation?', 'What’s one decision you’d like more room for, whether that’s more time or more talking it out?'],
      tryThis: c => c[0] === 'Q' ? 'Label your ideas out loud this week: “just brainstorming” or “I’ve decided.” Notice how people respond.' : 'Practice one sentence this week: “Let me think and get back to you by ___.” Then come back with your answer when you said you would.',
      link: ['Find your natural rhythms', '/tools/frequency-calibration.html'] },
    { id: 'lens', title: 'How you make sense of things', sub: 'Your lens: the whole picture or the pieces',
      intro: ['Your lens is the first thing your mind reaches for when something new arrives: the shape of the whole, or the pieces right in front of you.', 'Knowing your lens helps you ask for information the way you actually take it in, instead of blaming yourself when it doesn’t stick.'],
      yours: c => c[1] === 'F'
        ? 'As a Forest thinker, you need the why before the how. A list with no context can feel meaningless, and you may get called scattered when really you were never given the map.'
        : 'As a Trees thinker, you need the how before the why. Vague plans can feel like standing in fog, and you may get called rigid when really you’re asking for solid ground.',
      prompts: () => ['Think of a time something finally clicked for you. What made it click?', 'What kind of instructions make you shut down?', 'Where has your way of thinking been a strength that other people didn’t notice?'],
      tryThis: c => c[1] === 'F' ? 'Before your next task, write one line: “This matters because ___.” Then list only the first step.' : 'The next time a plan feels vague, ask one concrete question: “What’s the first step, and when?”',
      link: ['Where your lens came from', '/growing-up.html'] },
    { id: 'voice', title: 'Finding your voice', sub: 'How you send what you mean',
      intro: ['How you speak was shaped by what felt safe to say growing up. Some of us learned that plain words got us in trouble. Others learned that hints never got heard.', 'This chapter is about sending what you mean in a way you can stand behind.'],
      yours: c => c[2] === 'D'
        ? 'As a Direct communicator, your honesty is a gift, but it can land harder than you intend, especially with someone who’s already stressed. Your clarity doesn’t need to shrink. It may just need a warm first sentence.'
        : 'As a Nuanced communicator, you protect people with your words. The cost is that your real needs can get lost in the cushioning, and resentment can build quietly.',
      prompts: () => ['What did you learn as a kid about saying what you think?', 'What’s something you’ve been hinting at but haven’t said plainly?', 'When do you feel most like yourself when you talk?'],
      tryThis: c => 'Use the three-part message from Say it so it lands: the fact, then the feeling, then the ask. ' + (c[2] === 'D' ? 'Once this week, say the feeling before the fact.' : 'Once this week, say the ask in one sentence, with no softener tacked on after it.'),
      link: ['Say it so it lands (WP-09)', '/workpapers/wp-09-say-it-so-it-lands.html'] },
    { id: 'listen', title: 'How you listen and receive', sub: 'What was meant versus how it landed',
      intro: ['What you hear isn’t only what was said. It’s filtered through your history, your energy and your wiring.', 'Knowing how you receive helps you separate what someone meant from how it landed.'],
      yours: c => c[3] === 'E'
        ? 'As an Explicit receiver, you take words at their word. That makes you trustworthy and fair, but you can be caught off guard when others expected you to read between the lines. Asking “do you mean ___?” is a skill, not a weakness.'
        : 'As an Attuned receiver, you catch the mood under the message. That’s real empathy, but it can also mean reacting to a tone that wasn’t about you. Checking the story you’re telling yourself helps.',
      prompts: () => ['What kind of comment sticks with you the longest?', 'When have you misread someone, or been misread yourself?', 'What do you wish people knew before giving you hard news?'],
      tryThis: c => c[3] === 'E' ? 'When something feels unclear this week, ask one direct clarifying question instead of guessing.' : 'When a tone stings this week, pause and ask yourself: “Is this about me, or are they carrying something else?”',
      link: ['The Signal Translator', '/signal-translator.html'] },
    { id: 'energy', title: 'Your energy and your senses', sub: 'What fills you up and what drains you', nt: NT_ENERGY,
      intro: ['Every brain has things that fill it up and things that drain it. Neurodivergent brains often have less room for sensory input, social demands or switching tasks.', 'That isn’t a character flaw. It’s information you can plan around.'],
      yours: c => c[0] === 'Q' ? 'Quick Sparks often run hot and then crash. Watch for the moment excitement tips into overdrive.' : 'Slow Simmers often drain quietly, so you can be running on empty before anyone notices, including you.',
      prompts: () => ['Name three things that fill you up.', 'Name three things that drain you fastest.', 'What’s one early sign that you’re running low?'],
      tryThis: () => 'Once a day this week, write one word for your energy. How much are you carrying? (WP-02) goes deeper: it shows how full your stress tank is today.',
      link: ['How much are you carrying? (WP-02)', '/workpapers/wp-02-how-much-are-you-carrying.html'] },
    { id: 'masks', title: 'The masks and the scripts', sub: 'Who you are underneath what you perform', nt: NT_MASK,
      intro: ['Many people learn to perform a version of themselves that’s easier for others: forcing eye contact, laughing on cue, hiding how hard things are. This is often called masking, and nearly everyone does some of it.', 'When it’s constant, it’s exhausting, and it can make it hard to know who you are underneath. Self-discovery is partly noticing the masks, so you can choose when to wear them.'],
      yours: c => c[3] === 'A' ? 'Attuned people often mask by managing everyone else’s mood first and their own last.' : 'Explicit receivers often mask by guessing at unwritten rules and rehearsing to get them right.',
      prompts: () => ['What do you do to seem “fine” around other people?', 'What old label or message about yourself doesn’t fit anymore?', 'Who are you safest being fully yourself around?'],
      tryThis: () => 'Pick one small mask to set down with one safe person this week, and notice how it feels.',
      link: ['Know your own wiring', '/know-yourself.html'] },
    { id: 'needs', title: 'Asking for what helps', sub: 'Turning self-knowledge into words others can use',
      intro: ['Self-discovery matters most when it turns into words other people can act on. Knowing what helps is the first half. Asking for it plainly, without apology, is the second.'],
      yours: () => { const w = chosenWords('helps'); return w.length ? 'You said these help you: ' + w.map(x => x.charAt(0).toLowerCase() + x.slice(1)).join('; ') + '. Pick one to ask for out loud this week.' : 'You didn’t pick anything in the “What helps me” part yet. Use Change answers on your results to add a few, then come back here.'; },
      prompts: () => ['Finish this sentence: “I work best when ___.”', 'Finish this sentence: “When I’m overwhelmed, it helps if you ___.”', 'Finish this sentence: “Something I need that I’ve never asked for is ___.”'],
      tryThis: () => 'Share your Wave Code and one of these sentences with someone you trust. Keep the shape simple: say what’s going on, state the need, and offer one specific way they can help.',
      link: ['Make a Wiring Card', '/wiring-card.html'] }
  ];
  CHAPTERS.forEach(c => { c.group = 'code'; });
  INPUTS.forEach(x => CHAPTERS.push({
    id: 'in-' + x.id, group: 'inputs', input: x.id, title: x.icon + ' Learning through ' + x.name.toLowerCase(), sub: x.short, intro: x.intro, nt: x.fit, link: x.link,
    yours: () => S.topInput === x.id ? 'This is your strongest input. ' + x.how + ' When you’re stressed, this is the channel you’ll fall back on, so tell people about it: “' + x.send + '”'
      : S.inputs.indexOf(x.id) >= 0 ? 'You picked this as one of your inputs. ' + x.how + ' To help someone reach you here: ' + lower(x.send)
        : 'You didn’t pick this input, which makes this chapter useful in a different way: it may be how someone you love takes things in. To send on their wavelength: ' + lower(x.send),
    prompts: () => x.prompts, tryThis: () => x.tryThis
  }));

  /* ---------- how the nine inputs connect ---------- */
  const LEVELS = [
    { n: 1, name: 'Obvious', color: '#3E6B4C', d: 'Connections most people notice right away.' },
    { n: 2, name: 'Natural partners', color: '#2B5B8C', d: 'Inputs that quietly work together.' },
    { n: 3, name: 'Cross-wired', color: '#A8792F', d: 'Links between inputs that seem unrelated. This is where relationships start to show up.' },
    { n: 4, name: 'Hidden', color: '#96412B', d: 'Connections most people never notice, even in themselves.' },
    { n: 5, name: 'Deepest', color: '#211D17', d: 'The links that explain why love and effort so often go unseen.' }
  ];
  const CONNECTIONS = [
    ['words', 'people', 1, 'Conversation', 'Talking it through is both at once. Words are the main road between people.'],
    ['pictures', 'nature', 1, 'Noticing the world', 'Both are about seeing what’s around you: shapes, colors and patterns.'],
    ['logic', 'pictures', 1, 'Charts and maps', 'A diagram is logic you can see.'],
    ['sound', 'body', 1, 'Rhythm', 'Rhythm lives in the body: dancing, tapping, walking in step to music.'],
    ['self', 'meaning', 1, 'Finding your why', 'Reflection leads to purpose. You find what matters by looking inward.'],
    ['words', 'logic', 1, 'Explaining', 'Reasoning out loud, step by step, uses both.'],
    ['logic', 'sound', 2, 'Music is math', 'Beats are counted, and melodies are patterns. Rhythm is math you can hear.'],
    ['body', 'pictures', 2, 'Moving through space', 'Your sense of where things are comes from moving through them: building, finding your way, arranging a room.'],
    ['nature', 'logic', 2, 'Sorting systems', 'Grouping things and figuring out how a system works is the root of science.'],
    ['people', 'self', 2, 'Empathy starts inside', 'Understanding others depends on understanding yourself first.'],
    ['words', 'sound', 2, 'The music of speech', 'Speech has rhythm, pitch and pauses. Poetry and storytelling live here.'],
    ['words', 'self', 2, 'Journaling', 'Writing is how many people discover what they actually feel.'],
    ['body', 'self', 3, 'Your body knows first', 'A tight chest or clenched jaw often shows up before you can name the feeling. Today’s Weather checks exactly this link.'],
    ['sound', 'people', 3, 'Tone carries mood', 'Tone moves feelings between people. Two tones slightly out of sync make the squeal that Chapter I describes.'],
    ['nature', 'people', 3, 'Reading the room', 'A household works like an ecosystem: everyone affects the whole.'],
    ['meaning', 'logic', 3, 'Values become rules', 'Fairness by promises versus fairness by outcome is a meaning question dressed as logic.'],
    ['words', 'body', 3, 'Hands help talking', 'Gesturing helps people find words, and fidgeting helps many people, especially with ADHD, listen better.'],
    ['self', 'nature', 3, 'Thinking outdoors', 'Many people reflect best outside, where quieter surroundings let inner thoughts surface.'],
    ['words', 'nature', 3, 'Naming things', 'Knowing the names of things helps you notice more of them.'],
    ['sound', 'pictures', 3, 'Seeing sound', 'Many people picture music as shapes or colors, and good design has rhythm too.'],
    ['pictures', 'self', 4, 'Inner pictures differ', 'Some people see vivid images in their mind; others see none at all, which is called aphantasia. Memory and imagination feel very different from the inside.'],
    ['sound', 'self', 4, 'Not everyone has an inner voice', 'Some people think in words they hear inside; others think in images, feelings or nothing word-like. Two partners may literally think in different formats.'],
    ['nature', 'meaning', 4, 'Awe', 'A big sky or an old tree can make people feel part of something larger. Noticing leads to meaning.'],
    ['logic', 'people', 4, 'Numbers protect people', 'Putting chores into minutes takes blame out of the conversation. That’s why the Lemonade Stand works.'],
    ['body', 'meaning', 4, 'Rituals', 'A goodnight kiss or a Sunday walk is a small action, but the agreement behind it gives it meaning.'],
    ['words', 'pictures', 4, 'Metaphor', 'A metaphor is a picture made of words. The radio, the ledger and the lemonade stand in this program are all drawings in language.'],
    ['sound', 'meaning', 4, 'Songs hold moments', 'Music carries meaning words can’t, which is why songs mark weddings, farewells and memories.'],
    ['logic', 'body', 4, 'Routines become muscle memory', 'Once a routine is practiced, it runs without thinking. A good chore system turns into habit and frees the mind.'],
    ['body', 'people', 5, 'Unseen care', 'Care sent through actions, like cooking, fixing or noticing, often goes unreceived by a words-first partner. Much unseen work is love sent on a channel the other person isn’t tuned to.'],
    ['sound', 'nature', 5, 'Static drains everything', 'Hums, beeps and clutter quietly tax the nervous system, which narrows every other input. Fixing the room fixes the signal.'],
    ['meaning', 'people', 5, 'An “us”', 'Shared meaning turns two separate lives into an us. People who name what they’re building together can weather far more daily friction.'],
    ['logic', 'self', 5, 'Feelings as facts', 'Writing down your own minutes, or how full your stress tank is, turns a vague feeling into a fact you can share without blame.'],
    ['pictures', 'people', 5, 'Faces are pictures', 'Many misunderstandings come from a face that doesn’t match the words, or from people, often Autistic, whose faces don’t show feelings the expected way.'],
    ['words', 'meaning', 5, 'Naming creates meaning', 'Giving something a name, like unbilled debt, makes invisible things easier to talk about. That’s the whole idea behind this program.'],
    ['nature', 'body', 5, 'You are nature', 'Your nervous system has seasons, rhythms and limits like every living thing. Rest isn’t laziness; it’s part of being alive.'],
    ['pictures', 'meaning', 5, 'Symbols', 'A ring, a photo, a drawing on the fridge. Pictures hold meaning where you can see it every day.']
  ];
  const WAVE_LINKS = { Q: ['body', 'sound', 'people'], S: ['self', 'meaning', 'words'], F: ['pictures', 'meaning', 'nature'], T: ['logic', 'body', 'nature'], D: ['words', 'logic'], N: ['people', 'sound'], E: ['words', 'logic'], A: ['sound', 'people', 'body'] };
  const WIRING_LINKS = [
    ['ADHD', 'Often strong: hands and movement, sound and rhythm, people, meaning. Often strained: long written words and repetitive logic steps without anything new.'],
    ['Autistic', 'Often strong: logic, pictures, nature and patterns, inner reflection, precise words. Often strained: loud sound and large groups of people.'],
    ['AuDHD', 'Often a mix of both lists, which can pull in two directions at once: wanting movement and new things while needing quiet and predictability.'],
    ['Dyslexic', 'Often strong: pictures, hands and movement, sound, spoken words with people. Often strained: written words.'],
    ['Highly sensitive', 'Often strong: inner reflection, sound, nature, people, meaning. Often strained: noisy rooms and crowds.'],
    ['Neurotypical', 'Any mix is possible. Your own picks tell you more than your wiring does.']
  ];
  const TOOL_LINKS = [
    ['The Lemonade Stand', '/lemonade-stand.html', 'logic,self', 'Numbers replace blame.'],
    ['Today’s Weather', '/quick-checks.html#today', 'body,self', 'Check in with your body before you talk.'],
    ['The Calm-Down Kit (WP-11)', '/wp-11.html', 'body,sound,nature', 'Settle your body and the room first.'],
    ['One owner per job (WP-03)', '/workpapers/wp-03-one-owner-per-job.html', 'logic,words,pictures', 'Ownership you can see.'],
    ['Say it so it lands (WP-09)', '/workpapers/wp-09-say-it-so-it-lands.html', 'words,self,people', 'Turn a reaction into a fact, a feeling and an ask.'],
    ['The 90-second daily check-in (WP-13)', '/workpapers/wp-13-daily-check-in.html', 'people,sound,self', 'Small, frequent tuning.'],
    ['Brain Breakers', '/soundscapes.html', 'sound,body,meaning', 'One agreed sound can mean “let’s pause.”'],
    ['Kind ways to say no (WP-01)', '/workpapers/wp-01.html', 'words,people', 'Saying no without a fight.'],
    ['The seven angles (Chapter III)', '/book/chapter-3.html', 'pictures,meaning,logic', 'Different vantage points on the same moment.']
  ];
  const NINE_CHECK = { words: 'Can I say it in one clear sentence?', logic: 'Do I know the fact and the reason?', pictures: 'Could I show or sketch it?', body: 'Is my body calm enough to talk?', sound: 'Will my tone match my words?', people: 'Have I thought about how it lands for them?', self: 'Do I know what I feel and need?', nature: 'Is this the right place and time?', meaning: 'Do I know why this matters to us?' };

  /* ---------- state: on this device only, and only if you turn that on ---------- */
  function fresh() {
    return { v: 1, keep: false, step: 0, name: '', nts: [], otherText: '', answers: { pace: [null, null, null], lens: [null, null, null], send: [null, null, null], recv: [null, null, null] },
      chips: [], showAll: {}, inputs: [], topInput: null, hp: { pick: {}, words: {}, at: 0 }, journal: {}, done: [], ch: null, view: null, connLevel: 0, connFocus: null, moved: false };
  }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } }
  function lsDel(k) { try { localStorage.removeItem(k); } catch (e) {} }
  function tidy(o) {
    const s = Object.assign(fresh(), o || {});
    s.answers = Object.assign(fresh().answers, s.answers || {});
    s.hp = Object.assign({ pick: {}, words: {}, at: 0 }, s.hp || {});
    ['nts', 'chips', 'inputs', 'done'].forEach(k => { if (!Array.isArray(s[k])) s[k] = []; });
    if (typeof s.journal !== 'object' || !s.journal) s.journal = {};
    if (s.ch !== null && !CHAPTERS[s.ch]) s.ch = null;
    return s;
  }
  function loadState() {
    const raw = lsGet(KEY);
    if (raw) { try { const o = JSON.parse(raw); if (o && typeof o === 'object') return tidy(o); } catch (e) {} }
    // an older Heartprint (or Pawprint) draft moves in, so nobody loses their answers
    for (const k of OLD_KEYS) {
      const old = lsGet(k); if (!old) continue;
      try {
        const h = JSON.parse(old);
        if (h && typeof h === 'object') {
          const s = fresh();
          s.keep = true; s.name = (h.name || '').slice(0, 40); s.moved = true;
          s.hp = { pick: h.pick || {}, words: h.words || {}, at: Math.max(0, Math.min(STEPS.length - 1, +h.at || 0)) };
          if (lsSet(KEY, JSON.stringify(s))) OLD_KEYS.forEach(lsDel);
          return s;
        }
      } catch (e) {}
    }
    return fresh();
  }
  let S = loadState();
  function save() { if (S.keep) lsSet(KEY, JSON.stringify(S)); else lsDel(KEY); }

  /* ---------- helpers ---------- */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function lower(t) { return t.charAt(0).toLowerCase() + t.slice(1); }
  function cap(t) { return t.charAt(0).toUpperCase() + t.slice(1); }
  function $(sel) { return root.querySelector(sel); }
  function $$(sel) { return Array.prototype.slice.call(root.querySelectorAll(sel)); }
  function banksFor() {
    if (S.nts.indexOf('unsure') >= 0) return BANKS.slice();
    return BANKS.filter(b => b === 'general' || S.nts.indexOf(b) >= 0);
  }
  function pickedBanks() { return ['adhd', 'autistic', 'dyslexic', 'sensitive'].filter(id => S.nts.indexOf(id) >= 0); }
  function ntLabel() {
    let labels = NEUROTYPES.filter(t => S.nts.indexOf(t.id) >= 0 && t.id !== 'other').map(t => t.label);
    if (S.nts.indexOf('adhd') >= 0 && S.nts.indexOf('autistic') >= 0) { labels = labels.filter(l => l !== 'ADHD' && l !== 'Autistic'); labels.unshift('AuDHD'); }
    if (S.nts.indexOf('other') >= 0) labels.push(S.otherText ? S.otherText : 'something else');
    return labels.join(', ');
  }
  function codeDone() { return ['pace', 'lens', 'send', 'recv'].every(id => S.answers[id].every(v => v !== null)); }
  function score() {
    const scores = [0, 0, 0, 0], first = [0, 0, 0, 0];
    SECTIONS.forEach(sec => {
      if (sec.axis === null) return;
      S.answers[sec.id].forEach((v, i) => { if (v !== null) { const val = v === 'a' ? 2 : -2; scores[sec.axis] += val; if (i === 0) first[sec.axis] = val; } });
      Object.keys(sec.chips).forEach(bank => sec.chips[bank].forEach((c, i) => { if (S.chips.indexOf(sec.id + ':' + bank + ':' + i) >= 0) scores[sec.axis] += c[1]; }));
    });
    const code = scores.map((s, i) => { const v = s !== 0 ? s : first[i]; return v >= 0 ? AXES[i][0] : AXES[i][1]; }).join('');
    return { code, scores };
  }
  // where the Wave Code and the statement point two ways: normal, and worth a second look
  const TWO_WAYS = [
    ['Q', 'wired', 'thinkfirst', 'Quick Spark', 'I think first, then talk', 'Many people think out loud about small things and quietly about big ones. Which is which for you?'],
    ['S', 'wired', 'thinkloud', 'Slow Simmer', 'I think out loud', 'Many people talk to think in easy moments and go quiet when it matters. Which is which for you?'],
    ['D', 'wired', 'hint', 'Direct', 'I hint more than I say', 'Plenty of people are direct at work and hint at home, or the other way around. Where does each one show up?'],
    ['N', 'wired', 'direct', 'Nuanced', 'I say things directly', 'You may be plain-spoken about facts and gentler about feelings. Where does each one show up?'],
    ['F', 'wired', 'details', 'Forest', 'I notice the details', 'Big-picture thinkers often notice details that matter to them. Which details catch your eye?'],
    ['T', 'wired', 'bigpic', 'Trees', 'I see the big picture', 'Detail-minded people can still see the whole. When do you zoom out?']
  ];
  function twoWays(code, scores) {
    const out = [];
    TWO_WAYS.forEach(r => { if (code.indexOf(r[0]) >= 0 && hpPicked(r[1], r[2])) out.push('Your Wave Code says <strong>' + r[3] + '</strong>, and in your statement you picked “' + r[4] + '.” ' + r[5]); });
    scores.forEach((v, i) => { if (Math.abs(v) <= 1) { const a = LETTERS[AXES[i][0]], b = LETTERS[AXES[i][1]]; out.push('On ' + a.axis.toLowerCase() + ' you landed right in the middle, between <strong>' + a.name + '</strong> and <strong>' + b.name + '</strong>. You may switch between them depending on the day or the person.'); } });
    if (!out.length) return '';
    return '<div class="wl-sect wl-twoways"><h3>Where your answers point two ways</h3><p class="wl-small">That’s normal. People aren’t one thing all the time, and a mix often means you adjust to the moment. These are worth a second look, and you can change any answer.</p><ul class="wl-words">' + out.map(x => '<li>' + x + '</li>').join('') + '</ul></div>';
  }
  function chosenWords(secId) {
    const sec = SECTIONS.find(s => s.id === secId), out = [];
    Object.keys(sec.chips).forEach(bank => sec.chips[bank].forEach((c, i) => { if (S.chips.indexOf(secId + ':' + bank + ':' + i) >= 0) out.push(c[0]); }));
    return out;
  }
  function inputsLabel() { return S.inputs.map(id => IN[id]).filter(Boolean).map(x => x.name).join(', '); }
  function lean(s) { const a = Math.abs(s); return a >= 6 ? 'Strongly' : a >= 3 ? 'Mostly' : a >= 1 ? 'Leans' : 'Close call, leans'; }

  // the statement
  function hpPicked(step, id) { return !!(S.hp.pick[step] && S.hp.pick[step].indexOf(id) >= 0); }
  function joinList(a, word) { if (a.length <= 1) return a.join(''); return a.slice(0, -1).join(', ') + (a.length > 2 ? ',' : '') + ' ' + word + ' ' + a[a.length - 1]; }
  function sentences() {
    const out = [];
    STEPS.forEach(st => {
      const ids = S.hp.pick[st.id] || [], bits = st.o.filter(o => ids.indexOf(o[0]) >= 0).map(o => o[2]);
      const own = (S.hp.words[st.id] || '').trim();
      if (!bits.length && !own) return;
      let line = bits.length ? cap(st.lead + joinList(bits, st.join) + '.') : '';
      if (own) line += (line ? ' ' : '') + cap(own.replace(/\s+/g, ' ')) + (/[.!?]$/.test(own) ? '' : '.');
      out.push({ t: st.t, line });
    });
    return out;
  }
  function insights() { return INSIGHTS.filter(x => x.when.every(w => w[1] === '*' ? (S.hp.pick[w[0]] || []).length > 0 : hpPicked(w[0], w[1]))); }
  function stmtTitle() { const n = S.name.trim(); return (n ? n + '’s' : 'My') + ' Wavelength statement'; }
  function stmtPlain() {
    const lines = sentences();
    return stmtTitle() + '\n(a little note about me, so you don’t have to guess)\n\n' + lines.map(x => x.line).join('\n\n') + (lines.length ? '\n\nThank you for reading this. It’s how I work best, not a list of rules.' : '');
  }

  /* ---------- waveform ---------- */
  function wavePath(fast, crisp, tall, w, h, phase) {
    const cycles = fast ? 7 : 3, amp = (tall ? .42 : .26) * h, mid = h / 2;
    let d = '';
    for (let x = 0; x <= w; x += 3) {
      let s = Math.sin((x / w) * cycles * 2 * Math.PI + phase);
      if (crisp) s = Math.sign(s) * Math.pow(Math.abs(s), .3);
      d += (x === 0 ? 'M' : 'L') + x.toFixed(1) + ' ' + (mid - s * amp).toFixed(1) + ' ';
    }
    return d;
  }
  function waveSVG(code, animate) {
    const w = 600, h = 120, fast = code[0] === 'Q', crisp = code[1] === 'T', tall = code[2] === 'D', attuned = code[3] === 'A';
    let paths = '';
    if (attuned) {
      paths += '<path d="' + wavePath(fast, crisp, tall, w, h, .7) + '" fill="none" stroke="#2B5B8C" stroke-opacity=".22" stroke-width="2"/>';
      paths += '<path d="' + wavePath(fast, crisp, tall, w, h, .35) + '" fill="none" stroke="#2B5B8C" stroke-opacity=".4" stroke-width="2"/>';
    } else paths += '<line x1="0" y1="' + h / 2 + '" x2="' + w + '" y2="' + h / 2 + '" stroke="#D9CBA3" stroke-width="1.5"/>';
    paths += '<path class="' + (animate ? 'wl-draw' : '') + '" d="' + wavePath(fast, crisp, tall, w, h, 0) + '" fill="none" stroke="#2B5B8C" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>';
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none" role="img" aria-label="' + (animate ? 'Your personal waveform' : 'A sample waveform') + '">' + paths + '</svg>';
  }

  /* ---------- screens ---------- */
  function keepBox(id) {
    return '<label class="wl-keep"><input type="checkbox" data-keep id="' + id + '"' + (S.keep ? ' checked' : '') + '> Keep my answers and journal on this device, so I can come back to them</label>';
  }
  function render() {
    save();
    if (S.step === 0) return renderIntro();
    if (S.step === 1) return renderNT();
    if (S.step <= TOTAL + 1) { const sec = SECTIONS[S.step - 2]; return sec.custom === 'inputs' ? renderInputs(sec) : sec.custom === 'statement' ? renderStatement(sec) : renderSection(sec); }
    S.step = RESULTS;
    if (S.view === 'connections') return renderConnections();
    if (S.ch !== null && CHAPTERS[S.ch]) return renderChapter(S.ch);
    return renderResult();
  }
  function toTop(sel) {
    const top = root.getBoundingClientRect().top;
    if (top < 0 || top > window.innerHeight * .6) root.scrollIntoView({ block: 'start' });
    const h = $(sel || 'h2'); if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
  }
  function go(n) { S.step = n; S.ch = null; S.view = null; render(); toTop(); }
  function redraw(fn, sel) { const y = window.scrollY; fn(); window.scrollTo(0, y); if (sel) { const f = $(sel); if (f) f.focus({ preventScroll: true }); } }
  function progress() {
    let bars = ''; for (let i = 1; i <= TOTAL + 1; i++) bars += '<span class="' + (i <= S.step ? 'on' : '') + '"></span>';
    return '<div class="wl-progress" aria-hidden="true">' + bars + '</div>';
  }
  function partLabel() { return '<p class="wl-steplabel">Part ' + (S.step - 1) + ' of ' + TOTAL + '</p>'; }

  function renderIntro() {
    const hasHp = sentences().length > 0;
    root.innerHTML =
      '<section class="wl-hero">' +
        '<h2>Find your wavelength</h2>' + waveSVG('QFNA', false) +
        '<p>Find out how you think, how you share and how you take things in. Then share your Wave Code so the people close to you can tune in.</p>' +
        '<p class="wl-small">Seven short parts, mostly tapping, about ten minutes in all. The last part, your statement, is optional. Your Wave Code is four letters, a bit like the four-letter personality types you may have seen. It’s a fun way to describe your preferences, not a test that measures you. Afterward, sixteen self-discovery chapters open up: seven for your Wave Code and nine for the ways you take things in and learn.</p>' +
        '<p class="wl-small">Fill it in about yourself. If you want to understand someone else, ask them to take it too, then compare.</p>' +
        (S.moved && hasHp ? '<p class="wl-mine"><strong>Welcome back.</strong> Your Heartprint is now part of Wavelength. Your answers came with you: they’re in Part 7, Your statement.</p>' : '') +
        '<label class="wl-field" for="wl-nm">Your first name (optional)</label>' +
        '<input type="text" id="wl-nm" maxlength="30" autocomplete="given-name" value="' + esc(S.name) + '">' +
        keepBox('wl-keep-intro') +
        '<div class="wl-nav"><span></span><button type="button" class="wl-btn" id="wl-go">Start</button></div>' +
        (hasHp || codeDone() ? '<div class="wl-nav wl-nav-quiet">' + (hasHp ? '<button type="button" class="wl-linkbtn" id="wl-tostmt">Go to my statement</button>' : '') + (codeDone() ? '<button type="button" class="wl-linkbtn" id="wl-tores">See my results</button>' : '') + '</div>' : '') +
        '<p class="wl-note">Nothing you type or choose is sent anywhere. It stays in this browser, and it’s kept only if you tick the box.</p>' +
      '</section>';
    const nm = $('#wl-nm');
    nm.oninput = () => { S.name = nm.value.trim(); save(); };
    $('#wl-go').onclick = () => { S.name = nm.value.trim(); go(1); };
    const ts = $('#wl-tostmt'); if (ts) ts.onclick = () => go(TOTAL + 1);
    const tr = $('#wl-tores'); if (tr) tr.onclick = () => go(RESULTS);
  }

  function comboNote() {
    const n = S.nts;
    if (n.indexOf('adhd') >= 0 && n.indexOf('autistic') >= 0) return 'ADHD and Autistic together is often called AuDHD. The two can pull in different directions, like wanting new things and needing routine, and that’s normal.';
    if (n.indexOf('adhd') >= 0 && n.indexOf('dyslexic') >= 0) return 'ADHD and dyslexia often show up together. You’ll see options from both.';
    if (n.indexOf('nt') >= 0 && n.length > 1) return 'Neurotypical plus another trait is fine. Many people are mostly typical with one area that works differently.';
    if (pickedBanks().length > 1) return 'You’ll see options from each wiring type you picked.';
    return '';
  }
  function renderNT() {
    const combo = comboNote(), sel = S.nts.map(id => NEUROTYPES.find(t => t.id === id)).filter(Boolean);
    root.innerHTML =
      '<section class="wl-step">' + progress() +
        '<p class="wl-steplabel">Optional: your wiring</p>' +
        '<h2>How is your brain wired?</h2>' +
        '<p class="wl-lede">Select all that apply, or skip this step. It only decides which options you see first. Self-identified is welcome, and no diagnosis is needed.</p>' +
        '<div class="wl-nt-grid" role="group" aria-label="Wiring types">' + NEUROTYPES.map(t => '<button type="button" class="wl-nt" data-nt="' + t.id + '" aria-pressed="' + (S.nts.indexOf(t.id) >= 0) + '"><strong>' + t.label + '</strong><span>' + t.desc + '</span></button>').join('') + '</div>' +
        (S.nts.indexOf('other') >= 0 ? '<label class="wl-field" for="wl-ot">Name your wiring (optional)</label><input type="text" id="wl-ot" maxlength="60" value="' + esc(S.otherText || '') + '">' : '') +
        (sel.length ? '<div class="wl-picked" role="status">' + sel.map(t => '<p><strong>' + t.label + ':</strong> ' + t.about + '</p>').join('') + '</div>' : '') +
        (combo ? '<p class="wl-combo" role="status">' + combo + '</p>' : '') +
        '<div class="wl-nav wl-nav-sticky"><button type="button" class="wl-btn ghost" id="wl-back">Back</button><button type="button" class="wl-btn" id="wl-next">' + (S.nts.length ? 'Continue' : 'Skip for now') + '</button></div>' +
        '<div class="wl-guide">' +
          '<h3>Not sure which fits? A quick guide</h3>' +
          '<p class="wl-small">Read through and select any that sound like you. Many people have more than one. ADHD and autism often show up together, dyslexia often overlaps with ADHD, and being highly sensitive can go with any of them.</p>' +
          NEUROTYPES.map(t => '<div class="wl-gitem"><div class="wl-ghead"><strong>' + t.label + '</strong><button type="button" class="wl-gpick" data-gnt="' + t.id + '" aria-pressed="' + (S.nts.indexOf(t.id) >= 0) + '" aria-label="' + t.label + ': that’s me">' + (S.nts.indexOf(t.id) >= 0 ? '✓ Selected' : 'That’s me') + '</button></div><p>' + t.about + '</p><p class="wl-small"><em>You might relate if:</em> ' + t.relate + '</p></div>').join('') +
          '<p class="wl-small">This guide isn’t a diagnosis. Your wiring here is self-identified, and you can change it anytime. If you’re curious about a formal assessment, a doctor or psychologist can help.</p>' +
          '<p class="wl-small">Want to go deeper first? <a href="/wired-differently.html">Wired Differently</a> shows how differently wired people hear the same words, and <a href="/know-yourself.html">Know your own wiring</a> helps you tell what’s you, what life taught you and what’s just today.</p>' +
        '</div>' +
      '</section>';
    const toggle = (id, sel2) => { const i = S.nts.indexOf(id); if (i >= 0) S.nts.splice(i, 1); else S.nts.push(id); save(); redraw(renderNT, sel2); };
    $$('.wl-nt').forEach(b => { b.onclick = () => toggle(b.dataset.nt, '.wl-nt[data-nt="' + b.dataset.nt + '"]'); });
    $$('.wl-gpick').forEach(b => { b.onclick = () => toggle(b.dataset.gnt, '.wl-gpick[data-gnt="' + b.dataset.gnt + '"]'); });
    const ot = $('#wl-ot'); if (ot) ot.oninput = () => { S.otherText = ot.value.trim(); save(); };
    $('#wl-back').onclick = () => go(0);
    $('#wl-next').onclick = () => go(2);
  }

  function renderSection(sec) {
    const mine = banksFor(), others = BANKS.filter(b => mine.indexOf(b) < 0), open = !!S.showAll[sec.id];
    const chipGroup = bank => '<div class="wl-group"><h4>' + BANK_NAMES[bank] + '</h4><div class="wl-chips">' +
      sec.chips[bank].map((c, i) => { const id = sec.id + ':' + bank + ':' + i; return '<button type="button" class="wl-chip" data-chip="' + id + '" aria-pressed="' + (S.chips.indexOf(id) >= 0) + '">' + esc(c[0]) + '</button>'; }).join('') + '</div></div>';
    const ans = S.answers[sec.id], ready = !ans || ans.every(v => v !== null);
    root.innerHTML =
      '<section class="wl-step">' + progress() + partLabel() +
        '<h2>' + sec.title + '</h2>' +
        '<p class="wl-lede">' + sec.lede + '</p>' +
        sec.qs.map((q, i) =>
          '<div class="wl-q" role="group" aria-label="' + esc(q.q) + '"><p>' + esc(q.q) + '</p><div class="wl-pair">' +
            '<button type="button" class="wl-opt" data-q="' + i + '" data-v="a" aria-pressed="' + (ans[i] === 'a') + '">' + esc(q.a) + '</button>' +
            '<button type="button" class="wl-opt" data-q="' + i + '" data-v="b" aria-pressed="' + (ans[i] === 'b') + '">' + esc(q.b) + '</button>' +
          '</div></div>').join('') +
        '<p class="wl-chiphead">' + (sec.axis === null ? 'Tap all that help' : 'Tap any that sound like you') + '</p>' +
        '<p class="wl-chiphint">' + (sec.axis === null ? 'Pick as many as you like.' : 'Optional, but these make your profile sound like you.') + (S.nts.length ? '' : ' Picked your wiring? You’ll see the options most common for it first.') + '</p>' +
        mine.map(chipGroup).join('') +
        (others.length ? '<button type="button" class="wl-linkbtn" id="wl-more" aria-expanded="' + open + '">' + (open ? 'Hide other options' : 'Show options from other wiring types') + '</button>' + (open ? others.map(chipGroup).join('') : '') : '') +
        '<p class="wl-needs" id="wl-need">' + (ready ? '' : 'Answer the questions above to continue.') + '</p>' +
        '<div class="wl-nav wl-nav-sticky"><button type="button" class="wl-btn ghost" id="wl-back">Back</button><button type="button" class="wl-btn" id="wl-next"' + (ready ? '' : ' disabled') + '>Continue</button></div>' +
      '</section>';
    $$('.wl-opt').forEach(b => { b.onclick = () => { S.answers[sec.id][+b.dataset.q] = b.dataset.v; save(); redraw(() => renderSection(sec), '.wl-opt[data-q="' + b.dataset.q + '"][data-v="' + b.dataset.v + '"]'); }; });
    $$('.wl-chip').forEach(b => { b.onclick = () => { const id = b.dataset.chip, i = S.chips.indexOf(id); if (i >= 0) S.chips.splice(i, 1); else S.chips.push(id); b.setAttribute('aria-pressed', S.chips.indexOf(id) >= 0); save(); }; });
    const more = $('#wl-more'); if (more) more.onclick = () => { S.showAll[sec.id] = !open; save(); redraw(() => renderSection(sec), '#wl-more'); };
    $('#wl-back').onclick = () => go(S.step - 1);
    $('#wl-next').onclick = () => go(S.step + 1);
  }

  function renderInputs(sec) {
    const fitFor = x => pickedBanks().filter(b => x.fit[b]).map(b => ({ adhd: 'ADHD', autistic: 'Autistic', dyslexic: 'Dyslexic', sensitive: 'highly sensitive' }[b]));
    const picked = INPUTS.filter(x => S.inputs.indexOf(x.id) >= 0);
    root.innerHTML =
      '<section class="wl-step">' + progress() + partLabel() +
        '<h2>' + sec.title + '</h2>' +
        '<p class="wl-lede">' + sec.lede + '</p>' +
        '<div class="wl-in-grid" role="group" aria-label="The nine inputs of learning">' + INPUTS.map(x => { const f = fitFor(x); return '<button type="button" class="wl-incard" data-in="' + x.id + '" aria-pressed="' + (S.inputs.indexOf(x.id) >= 0) + '">' +
          '<span class="wl-inico" aria-hidden="true">' + x.icon + '</span><strong>' + x.name + '</strong><span>' + x.short + '</span>' + (f.length ? '<em>Often a fit for ' + f.join(' and ') + ' folks</em>' : '') + '</button>'; }).join('') + '</div>' +
        (picked.length > 1 ? '<p class="wl-chiphead">Which one is strongest?</p><div class="wl-chips" role="group" aria-label="Your strongest input">' + picked.map(x => '<button type="button" class="wl-chip" data-top="' + x.id + '" aria-pressed="' + (S.topInput === x.id) + '">' + x.icon + ' ' + x.name + '</button>').join('') + '</div>' : '') +
        '<p class="wl-evidence">These nine are adapted from Howard Gardner’s idea of multiple intelligences. Treat them as preferences, not fixed learning styles: research doesn’t support learning through only one style, and most people learn best when several inputs work together.</p>' +
        '<div class="wl-nav wl-nav-sticky"><button type="button" class="wl-btn ghost" id="wl-back">Back</button><button type="button" class="wl-btn" id="wl-next">' + (S.inputs.length ? 'Continue' : 'Skip for now') + '</button></div>' +
      '</section>';
    $$('.wl-incard').forEach(b => { b.onclick = () => {
      const id = b.dataset.in, i = S.inputs.indexOf(id);
      if (i >= 0) { S.inputs.splice(i, 1); if (S.topInput === id) S.topInput = null; } else S.inputs.push(id);
      if (S.inputs.length === 1) S.topInput = S.inputs[0];
      if (!S.inputs.length) S.topInput = null;
      save(); redraw(() => renderInputs(sec), '.wl-incard[data-in="' + id + '"]'); }; });
    $$('[data-top]').forEach(b => { b.onclick = () => { S.topInput = b.dataset.top; save(); redraw(() => renderInputs(sec), '[data-top="' + b.dataset.top + '"]'); }; });
    $('#wl-back').onclick = () => go(S.step - 1);
    $('#wl-next').onclick = () => go(S.step + 1);
  }

  function insightList(ins) {
    return ins.length ? '<ul class="wl-ins-list">' + ins.map(x => { const P = PIL[x.p]; return '<li><strong>' + esc(x.t) + '</strong><p>' + esc(x.d) + '</p><p class="wl-tag">' + esc(F[x.f]) + ' · <a href="/five-pillars.html#' + P[1] + '">' + esc(P[0]) + '</a> · <a href="' + x.l[1] + '">' + esc(x.l[0]) + ' →</a></p></li>'; }).join('') + '</ul>'
      : '<p class="wl-small">As you choose, connections between your choices show up here: things that are easy to miss about yourself, and why they matter to the people around you.</p>';
  }
  function stmtCard(lines) {
    return '<div class="wl-card"><p class="wl-card-h">' + esc(stmtTitle()) + '</p><p class="wl-card-s">A little note about me, so you don’t have to guess</p>' +
      (lines.length ? lines.map(x => '<p>' + esc(x.line) + '</p>').join('') + '<p class="wl-card-end">Thank you for reading this. It’s how I work best, not a list of rules.</p>'
        : '<p class="wl-card-empty">Your statement builds itself here as you choose.</p>') + '</div>';
  }
  function renderStatement(sec) {
    const at = Math.max(0, Math.min(STEPS.length - 1, S.hp.at || 0)), st = STEPS[at], ins = insights(), lines = sentences();
    const dots = STEPS.map((x, i) => { const has = (S.hp.pick[x.id] || []).length || (S.hp.words[x.id] || '').trim(); return '<li class="' + (i === at ? 'is-now' : '') + (has ? ' is-done' : '') + '"><button type="button" data-hpgo="' + i + '" aria-label="Statement step ' + (i + 1) + ': ' + esc(x.t) + (i === at ? ' (you’re here)' : '') + '">' + (i + 1) + '</button></li>'; }).join('');
    root.innerHTML =
      '<section class="wl-step">' + progress() + partLabel() +
        '<h2>Your statement <span class="wl-opt-tag">optional</span></h2>' +
        '<p class="wl-lede">A short, warm note about the one-of-a-kind way you work, in nine quick steps, mostly tapping. It writes itself as you go, and “Things you might not have noticed” shows connections between your choices that are easy to miss. Skip it if you like: your Wave Code doesn’t need it.</p>' +
        '<div class="wl-nav wl-nav-quiet"><span></span><button type="button" class="wl-linkbtn" id="wl-skip">Skip the statement and see my results</button></div>' +
        '<div class="wl-hp">' +
          '<ol class="wl-dots" aria-label="Statement steps">' + dots + '</ol>' +
          '<p class="wl-steplabel">Statement step ' + (at + 1) + ' of ' + STEPS.length + '</p>' +
          '<h3 id="wl-hp-h">' + esc(st.t) + '</h3>' +
          '<p>' + esc(st.q) + (st.max ? '' : ' Pick as many as you like.') + '</p>' +
          '<div class="wl-chips" role="group" aria-label="' + esc(st.t) + '">' + st.o.map(o => { const on = hpPicked(st.id, o[0]); return '<button type="button" class="wl-chip" data-hp="' + o[0] + '" aria-pressed="' + on + '">' + esc(o[1]) + '</button>'; }).join('') + '</div>' +
          '<label class="wl-field" for="wl-own">In your own words (optional)</label>' +
          '<textarea id="wl-own" rows="2" maxlength="400" placeholder="Anything to add, in your own words…">' + esc(S.hp.words[st.id] || '') + '</textarea>' +
          '<div class="wl-nav">' + '<button type="button" class="wl-btn ghost" id="wl-hpprev">' + (at ? '← ' + esc(STEPS[at - 1].t) : 'Back') + '</button>' +
            (at < STEPS.length - 1 ? '<button type="button" class="wl-btn" id="wl-hpnext">Next →</button>' : '<button type="button" class="wl-btn" id="wl-next">See my Wave Code</button>') + '</div>' +
        '</div>' +
        '<div class="wl-ins" aria-live="polite"><h3>🔎 Things you might not have noticed' + (ins.length ? ' <span class="wl-n">' + ins.length + '</span>' : '') + '</h3>' + insightList(ins) + '</div>' +
        '<div class="wl-sect"><h3>Your statement so far</h3><div id="wl-live">' + stmtCard(lines) + '</div></div>' +
        keepBox('wl-keep-stmt') +
      '</section>';
    const goHp = n => { S.hp.at = n; save(); render(); toTop('#wl-hp-h'); };
    $$('[data-hpgo]').forEach(b => { b.onclick = () => goHp(+b.dataset.hpgo); });
    $$('[data-hp]').forEach(b => { b.onclick = () => {
      const id = b.dataset.hp, list = S.hp.pick[st.id] = S.hp.pick[st.id] || [], i = list.indexOf(id);
      if (i >= 0) list.splice(i, 1); else { if (st.max && list.length >= st.max) list.shift(); list.push(id); }
      save(); redraw(() => renderStatement(sec), '[data-hp="' + id + '"]'); }; });
    const own = $('#wl-own');
    own.oninput = () => { S.hp.words[st.id] = own.value; save(); clearTimeout(root._t); root._t = setTimeout(() => { const l = $('#wl-live'); if (l) l.innerHTML = stmtCard(sentences()); }, 300); };
    $('#wl-hpprev').onclick = () => { if (at) goHp(at - 1); else go(S.step - 1); };
    const hn = $('#wl-hpnext'); if (hn) hn.onclick = () => goHp(at + 1);
    const nx = $('#wl-next'); if (nx) nx.onclick = () => go(RESULTS);
    $('#wl-skip').onclick = () => go(RESULTS);
  }

  function copyText(text, toast, ok) {
    const t = $(toast), done = () => { if (t) t.textContent = ok; };
    const fallback = () => {
      const ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select();
      let worked = false; try { worked = document.execCommand('copy'); } catch (e) {} ta.remove();
      if (t) t.textContent = worked ? ok : 'Copying isn’t available here. Try “Save as a text file” instead.';
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fallback); else fallback();
  }
  function download(text, name) {
    const blob = new Blob([text], { type: 'text/plain' }), u = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 2000);
  }
  function eraseAll() {
    if (!window.confirm('Erase everything? This clears your wiring, your Wave Code answers, your statement and your journal from this device.')) return;
    S = fresh(); lsDel(KEY); OLD_KEYS.forEach(lsDel); render(); toTop();
    const n = $('.wl-note'); if (n) n.textContent = 'Everything is erased. Nothing from Wavelength is kept on this device now.';
  }

  function renderResult() {
    const done = codeDone(), sc = score(), code = sc.code, scores = sc.scores, arch = ARCHETYPES[code][0], tag = ARCHETYPES[code][1];
    const who = S.name ? esc(S.name) + '’s Wave Code' : 'Your Wave Code', nt = ntLabel(), lines = sentences(), ins = insights();
    const colors = ['#2B5B8C', '#3E6B4C', '#96412B', '#A8792F'];
    const letters = code.split('').map((L, i) => {
      const d = LETTERS[L], pos = 50 - Math.max(-8, Math.min(8, scores[i])) / 8 * 46, l = AXES[i][0], r = AXES[i][1];
      return '<details class="wl-letter"><summary><span class="wl-big" style="color:' + colors[i] + '">' + L + '</span>' +
        '<span class="wl-lt"><strong>' + d.name + '</strong><span>' + d.axis + ': ' + lean(scores[i]).toLowerCase() + ' ' + d.name + '</span></span><span class="wl-chev" aria-hidden="true">›</span></summary>' +
        '<div class="wl-lbody"><div class="wl-meter"><span>' + l + ', ' + LETTERS[l].name + '</span><span class="wl-bar"><span class="wl-dot" style="left:' + pos + '%"></span></span><span>' + r + ', ' + LETTERS[r].name + '</span></div>' +
          '<p><strong>What it means:</strong> ' + d.what + '</p><p><strong>The gift:</strong> ' + d.gift + '</p><p><strong>Watch for:</strong> ' + cap(d.watch) + '.</p>' +
          '<p class="wl-tune"><strong>How to tune in:</strong> ' + d.tune + '</p></div></details>';
    }).join('');
    const groups = [['pace', 'How I think and process'], ['lens', 'How I see things'], ['send', 'How I communicate'], ['recv', 'How I take things in']]
      .map(g => { const w = chosenWords(g[0]); return w.length ? '<div class="wl-wordgroup"><h4>' + g[1] + '</h4><ul class="wl-words">' + w.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul></div>' : ''; }).join('');
    const helps = chosenWords('helps');
    const chList = [['code', 'Your Wave Code'], ['inputs', 'The 9 inputs of learning']].map(g =>
      '<p class="wl-chgroup">' + g[1] + '</p><div class="wl-chlist">' + CHAPTERS.map((c, i) => c.group !== g[0] ? '' : '<button type="button" class="wl-chitem" data-ch="' + i + '"><span class="wl-chnum">' + (i + 1) + '</span><span><strong>' + c.title + '</strong><span class="wl-s">' + c.sub + '</span></span>' + (S.done.indexOf(c.id) >= 0 ? '<span class="wl-tick">✓ Done</span>' : '') + '</button>').join('') + '</div>').join('');
    const unlock = '<div class="wl-sect"><h3>Finish your Wave Code first</h3><p>Your four letters come from Parts 1 to 4. A few questions there aren’t answered yet.</p><div class="wl-actions"><button type="button" class="wl-btn" id="wl-finish">Find my Wave Code</button></div></div>';
    root.innerHTML =
      '<section class="wl-results">' +
        (done ?
          '<div class="wl-result-top">' +
            '<p class="wl-who">' + who + (nt ? ' <span class="wl-small">(self-identified wiring: ' + esc(nt) + ')</span>' : '') + '</p>' +
            '<h2 class="wl-code" aria-label="' + code.split('').join(' ') + '">' + code.split('').map(c => '<span>' + c + '</span>').join('') + '</h2>' +
            '<p class="wl-arch">' + arch + '</p>' +
            '<p class="wl-tagline">' + tag + '</p>' +
            (window.TOLShare ? '<div class="wl-actions"><button type="button" class="wl-btn ghost tol-share-btn" id="wl-sharecode">Share my Wave Code</button></div>' : '') +
            '<p class="wl-small"><strong>At your best:</strong> ' + code.split('').map(L => lower(LETTERS[L].gift.replace(/\.$/, ''))).join('; ') + '. <strong>Watch for:</strong> ' + code.split('').map(L => LETTERS[L].watch).join('; ') + '.</p>' +
          '</div>' +
          '<div class="wl-wavebox">' + waveSVG(code, true) +
            '<p class="wl-wavecap">Your waveform: faster waves for Quick Spark, slower for Slow Simmer; sharp edges for Trees, smooth for Forest; taller for Direct, softer for Nuanced; echoes for Attuned, one clean line for Explicit.</p></div>' +
          '<div class="wl-sect"><h3>What each letter means</h3><p class="wl-small">Tap a letter to open it. Each one is a preference on a line between two ends, and everyone uses both ends sometimes.</p>' + letters + '</div>' + twoWays(code, scores)
          : '<div class="wl-result-top"><p class="wl-who">' + (S.name ? esc(S.name) + '’s Wavelength' : 'Your Wavelength') + '</p></div>' + unlock) +
        (groups ? '<div class="wl-sect"><h3>In my own words</h3>' + groups + '</div>' : '') +
        '<div class="wl-sect" id="wl-inputs-sect"><h3>How I take things in</h3>' +
          (S.inputs.length ? '<p>' + (S.topInput ? '<strong>Strongest:</strong> ' + IN[S.topInput].icon + ' ' + IN[S.topInput].name + '. ' : '') + '<strong>All my inputs:</strong> ' + esc(inputsLabel()) + '.</p>' + (S.topInput ? '<p class="wl-tune"><strong>To reach me:</strong> ' + IN[S.topInput].send + '</p>' : '') : '<p>You skipped the learning inputs. You can add them with Change answers, or explore all nine below.</p>') +
          '<div class="wl-actions"><button type="button" class="wl-btn" id="wl-conn">Explore how the 9 inputs connect</button></div></div>' +
        (helps.length ? '<div class="wl-sect"><h3>What helps me feel understood</h3><ul class="wl-words">' + helps.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul></div>' : '') +
        '<div class="wl-sect" id="wl-stmt-sect"><h3>My statement</h3>' +
          (lines.length ? stmtCard(lines) +
            '<div class="wl-actions"><button type="button" class="wl-btn" id="wl-scopy">Copy my statement</button>' + (window.TOLShare ? '<button type="button" class="wl-btn ghost tol-share-btn" id="wl-sshare">Share my statement</button>' : '') + '<button type="button" class="wl-btn ghost" id="wl-sdl">Save as a text file</button><button type="button" class="wl-btn ghost" id="wl-sprint">Print</button><button type="button" class="wl-btn ghost" id="wl-sedit">Edit my statement</button></div>' +
            (ins.length ? '<details class="wl-insd"><summary>🔎 Things you might not have noticed (' + ins.length + ')</summary>' + insightList(ins) + '</details>' : '')
            : '<p>You skipped the statement. It’s a short, warm note about how you work best, in nine quick steps, and it shows connections between your choices you may not have noticed.</p><div class="wl-actions"><button type="button" class="wl-btn ghost" id="wl-sedit">Write my statement</button></div>') +
          '<p class="wl-toast" id="wl-stoast" role="status"></p></div>' +
        (done ?
          '<div class="wl-sect" id="wl-compare"><h3>Compare with someone</h3>' +
            '<p class="wl-small">Have them take Wavelength too, then enter their Wave Code to see where you’ll want to tune in on purpose.</p>' +
            '<div class="wl-pairbox"><label class="wl-sr" for="wl-pc">Their Wave Code</label><input type="text" id="wl-pc" maxlength="4" placeholder="e.g. SFNA" autocomplete="off" autocapitalize="characters"><button type="button" class="wl-btn ghost" id="wl-cmp">Compare</button></div>' +
            '<div class="wl-pairout" id="wl-pout" aria-live="polite"></div></div>' +
          '<div class="wl-sect" id="wl-chapters"><h3>Self-discovery chapters</h3>' +
            '<p class="wl-chcount">' + S.done.filter(id => CHAPTERS.some(c => c.id === id)).length + ' of ' + CHAPTERS.length + ' explored. Each one has a short reading written for you, a few journal prompts, and one thing to try this week.</p>' + chList +
            '<div class="wl-actions"><button type="button" class="wl-btn ghost" id="wl-copyj">Copy my journal</button></div><p class="wl-toast" id="wl-jtoast" role="status"></p></div>' : '') +
        '<div class="wl-sect"><h3>Keep, share or start again</h3>' +
          '<div class="wl-actions">' + (done ? '<button type="button" class="wl-btn" id="wl-copy">Copy my profile</button>' + (window.TOLShare ? '<button type="button" class="wl-btn ghost tol-share-btn" id="wl-share">Share my profile</button>' : '') : '') + '<button type="button" class="wl-btn ghost" id="wl-edit">Change answers</button><button type="button" class="wl-btn ghost" id="wl-wiring">Change my wiring</button><button type="button" class="wl-btn ghost" id="wl-erase">Erase everything</button></div>' +
          '<p class="wl-toast" id="wl-toast" role="status"></p>' + keepBox('wl-keep-res') + '</div>' +
        '<p class="wl-note">Wavelength is a reflection tool, not a diagnosis or a test that measures you. The options shown for each wiring type are common experiences, not rules, and every person is their own mix. Nothing you type or choose is sent anywhere.</p>' +
      '</section>';

    const p = root.querySelector('path.wl-draw');
    if (p && p.getTotalLength && !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) {
      const len = p.getTotalLength(); p.style.strokeDasharray = len; p.style.strokeDashoffset = len;
      p.getBoundingClientRect(); p.style.transition = 'stroke-dashoffset 1.6s ease-out'; p.style.strokeDashoffset = '0';
    }
    const on = (id, fn) => { const el = $(id); if (el) el.onclick = fn; };
    on('#wl-finish', () => { const i = ['pace', 'lens', 'send', 'recv'].findIndex(id => S.answers[id].some(v => v === null)); go(2 + Math.max(0, i)); });
    on('#wl-cmp', () => {
      const other = $('#wl-pc').value.toUpperCase().replace(/[^A-Z]/g, ''), out = $('#wl-pout');
      const valid = other.length === 4 && other.split('').every((c, i) => AXES[i].indexOf(c) >= 0);
      if (!valid) { out.innerHTML = '<p class="wl-needs">Enter four letters in order: Q or S, F or T, D or N, E or A.</p>'; return; }
      const same = AXES.filter((ax, i) => code[i] === other[i]).length;
      out.innerHTML = '<p><strong>' + code + '</strong> ' + arch + ' and <strong>' + other + '</strong> ' + ARCHETYPES[other][0] + '. You share ' + same + ' of 4 letters.</p>' + AXES.map((ax, i) =>
        '<div class="wl-pairrow"><strong>' + AXIS_NAMES[i] + ': ' + code[i] + ' and ' + other[i] + '</strong><br>' + (code[i] === other[i] ? 'Same wavelength here, so this usually runs smoothly. ' + LETTERS[code[i]].tune : PAIR_TIPS[i]) + '</div>').join('');
    });
    const pc = $('#wl-pc'); if (pc) pc.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); $('#wl-cmp').click(); } };
    const profileText = () => {
      const L2 = [(S.name ? S.name + '’s ' : 'My ') + 'Wave Code: ' + code + ', ' + arch, tag];
      if (nt) L2.push('Wiring (self-identified): ' + nt);
      L2.push('');
      code.split('').forEach(L => { const d = LETTERS[L]; L2.push(L + ', ' + d.name + ': ' + d.what + ' To tune in: ' + d.tune); });
      [['pace', 'How I think and process'], ['lens', 'How I see things'], ['send', 'How I communicate'], ['recv', 'How I take things in'], ['helps', 'What helps me feel understood']].forEach(g => { const w = chosenWords(g[0]); if (w.length) { L2.push('', g[1] + ':'); w.forEach(x => L2.push('- ' + x)); } });
      if (S.inputs.length) { L2.push('', 'The inputs I learn through: ' + inputsLabel() + (S.topInput ? ' (strongest: ' + IN[S.topInput].name + ')' : '')); if (S.topInput) L2.push('To reach me: ' + IN[S.topInput].send); }
      if (lines.length) L2.push('', 'In my own words:', lines.map(x => x.line).join(' '));
      L2.push('', 'Made with Wavelength from Spread Love & Acceptance: spreadloveandacceptance.com/wavelength.html');
      return L2.join('\n');
    };
    on('#wl-copy', () => copyText(profileText(), '#wl-toast', 'Copied. Paste it into a text or a note to share.'));
    // Share: only what the person chose to share, through the site's share (their own app, or a small sheet)
    const share = o => { if (window.TOLShare) window.TOLShare.share(o); };
    on('#wl-share', () => share({ title: 'My Wavelength', text: profileText(), url: false, result: true }));
    on('#wl-sshare', () => share({ title: 'My Wavelength statement', text: stmtPlain(), url: false, result: true }));
    on('#wl-sharecode', () => share({ title: 'My Wave Code', text: 'I’m a ' + code + ', ' + arch.replace(/^The /, 'the ') + '. Find your Wave Code:', url: '/wavelength.html', result: true }));
    if (window.TOLShareClip && window.TOLShareClip.mount) $$('#wl-share, #wl-sshare, #wl-sharecode').forEach(b => { try { window.TOLShareClip.mount(b); } catch (e) {} });
    on('#wl-scopy', () => copyText(stmtPlain(), '#wl-stoast', 'Copied. Paste it into a message, a note or a card.'));
    on('#wl-sdl', () => { download(stmtPlain(), (S.name.trim() ? S.name.trim().replace(/[^\w -]/g, '') + ' - ' : '') + 'My Wavelength statement.txt'); const t = $('#wl-stoast'); if (t) t.textContent = 'Saved to your device.'; });
    on('#wl-sprint', () => { document.documentElement.classList.add('wl-printing'); window.print(); setTimeout(() => document.documentElement.classList.remove('wl-printing'), 500); });
    on('#wl-sedit', () => go(TOTAL + 1));
    on('#wl-edit', () => go(2));
    on('#wl-wiring', () => go(1));
    on('#wl-conn', () => openConnections(null));
    on('#wl-erase', eraseAll);
    $$('.wl-chitem').forEach(b => { b.onclick = () => openChapter(+b.dataset.ch); });
    on('#wl-copyj', () => {
      const L2 = [(S.name ? S.name + '’s ' : 'My ') + 'Wavelength journal (' + code + ', ' + arch + ')'];
      CHAPTERS.forEach(c => { const a = S.journal[c.id] || []; if (a.some(x => x && x.trim())) { L2.push('', c.title); c.prompts(code).forEach((q, i) => { if (a[i] && a[i].trim()) L2.push('Q: ' + q, 'A: ' + a[i].trim()); }); } });
      if (L2.length === 1) { $('#wl-jtoast').textContent = 'Your journal is empty. Open a chapter and answer a prompt first.'; return; }
      copyText(L2.join('\n'), '#wl-jtoast', 'Journal copied.');
    });
  }
  function openChapter(n) { S.view = null; S.ch = n; render(); toTop(); }
  function backToResults(anchor) { S.ch = null; S.view = null; render(); const el = $(anchor); if (el) el.scrollIntoView({ block: 'start' }); const h = el && el.querySelector('h3'); if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); } }

  function renderChapter(i) {
    const c = CHAPTERS[i], code = score().code, ans = S.journal[c.id] || ['', '', ''], isDone = S.done.indexOf(c.id) >= 0;
    let ntBlock = '';
    if (c.nt) {
      let banks = pickedBanks().filter(b => c.nt[b]);
      if (!banks.length && c.nt.general) banks = ['general'];
      const notes = banks.map(b => '<p>' + c.nt[b] + '</p>').join('');
      if (notes) ntBlock = '<div class="wl-ntnote">' + notes + '</div>';
    }
    const conn = c.input ? CONNECTIONS.filter(x => x[0] === c.input || x[1] === c.input).sort((a, b) => a[2] - b[2]).slice(0, 4).map(x => { const o = IN[x[0] === c.input ? x[1] : x[0]]; return o.icon + ' ' + o.name + ' (' + x[3].toLowerCase() + ')'; }).join(', ') : '';
    root.innerHTML =
      '<section class="wl-chapter">' +
        '<button type="button" class="wl-linkbtn" id="wl-toresults">← Back to my results</button>' +
        '<p class="wl-kick">' + (c.group === 'inputs' ? 'The 9 inputs of learning' : 'Your Wave Code') + ': chapter ' + (i + 1) + ' of ' + CHAPTERS.length + '</p>' +
        '<h2>' + c.title + '</h2>' +
        '<div class="wl-read">' + c.intro.map(p => '<p>' + p + '</p>').join('') + '</div>' +
        '<p class="wl-yours">' + esc(c.yours(code)) + '</p>' + ntBlock +
        (c.input ? '<div class="wl-cbub"><p><strong>How it connects:</strong> ' + conn + ', and more.</p><p><button type="button" class="wl-linkbtn" id="wl-seeconn">See all of its connections</button></p></div>' : '') +
        '<h3>Reflect</h3>' +
        '<p class="wl-small">Write as much or as little as you like. What you write stays in this browser and is never sent anywhere.</p>' +
        (S.keep ? '' : '<p class="wl-mine wl-small">To keep your journal after you close this page, tick the box below.</p>') +
        keepBox('wl-keep-ch') +
        c.prompts(code).map((q, k) => '<div class="wl-prompt"><label for="wl-j' + k + '">' + esc(q) + '</label><textarea id="wl-j' + k + '" data-k="' + k + '">' + esc(ans[k] || '') + '</textarea></div>').join('') +
        '<p class="wl-saved" id="wl-saved" role="status"></p>' +
        '<div class="wl-trythis"><h3>Try this week</h3><p>' + esc(c.tryThis(code)) + '</p>' + (c.link ? '<p><a href="' + c.link[1] + '">' + esc(c.link[0]) + ' →</a></p>' : '') + '</div>' +
        '<button type="button" class="wl-btn ' + (isDone ? 'ghost' : '') + '" id="wl-done" aria-pressed="' + isDone + '">' + (isDone ? '✓ Marked done' : 'Mark chapter done') + '</button>' +
        '<div class="wl-nav">' + (i > 0 ? '<button type="button" class="wl-btn ghost" id="wl-prevch">Previous chapter</button>' : '<span></span>') +
          (i < CHAPTERS.length - 1 ? '<button type="button" class="wl-btn" id="wl-nextch">Next chapter</button>' : '<button type="button" class="wl-btn" id="wl-finishch">Back to my results</button>') + '</div>' +
      '</section>';
    let timer;
    $$('textarea[data-k]').forEach(t => { t.oninput = () => {
      const a = S.journal[c.id] || ['', '', '']; a[+t.dataset.k] = t.value; S.journal[c.id] = a;
      clearTimeout(timer); timer = setTimeout(() => { save(); $('#wl-saved').textContent = S.keep ? 'Saved on this device.' : 'Not kept yet: tick the box above to keep your journal on this device.'; }, 400);
    }; });
    const back = () => backToResults('#wl-chapters');
    $('#wl-toresults').onclick = back;
    $('#wl-done').onclick = () => { const k = S.done.indexOf(c.id); if (k >= 0) S.done.splice(k, 1); else S.done.push(c.id); save(); redraw(() => renderChapter(i), '#wl-done'); };
    const pv = $('#wl-prevch'); if (pv) pv.onclick = () => openChapter(i - 1);
    const nx = $('#wl-nextch'); if (nx) nx.onclick = () => openChapter(i + 1);
    const fn = $('#wl-finishch'); if (fn) fn.onclick = back;
    const sc = $('#wl-seeconn'); if (sc) sc.onclick = () => openConnections(c.input);
  }

  /* ---------- how the nine inputs connect ---------- */
  function openConnections(focus) { S.view = 'connections'; S.ch = null; S.connFocus = focus || null; render(); toTop(); }
  function connMap() {
    const W = 340, C = 170, R = 122, lv = S.connLevel || 0, f = S.connFocus, pos = {};
    INPUTS.forEach((x, i) => { const a = -Math.PI / 2 + i * 2 * Math.PI / 9; pos[x.id] = [C + R * Math.cos(a), C + R * Math.sin(a)]; });
    const lines = CONNECTIONS.map(cn => { const a = cn[0], b = cn[1], l = cn[2], hit = (!lv || lv === l) && (!f || a === f || b === f);
      return '<line x1="' + pos[a][0].toFixed(1) + '" y1="' + pos[a][1].toFixed(1) + '" x2="' + pos[b][0].toFixed(1) + '" y2="' + pos[b][1].toFixed(1) + '" stroke="' + LEVELS[l - 1].color + '" stroke-width="' + (hit ? 2.6 : 1) + '" stroke-opacity="' + (hit ? .9 : .08) + '"/>'; }).join('');
    const nodes = INPUTS.map(x => { const px = pos[x.id][0], py = pos[x.id][1], mine = S.inputs.indexOf(x.id) >= 0, sel = f === x.id;
      return '<g class="wl-mnode" data-node="' + x.id + '" role="button" tabindex="0" aria-label="' + x.name + '" aria-pressed="' + sel + '">' +
        '<circle cx="' + px.toFixed(1) + '" cy="' + py.toFixed(1) + '" r="23" fill="' + (sel ? '#DCE6F0' : '#FBF7EC') + '" stroke="' + (mine ? '#3E6B4C' : '#D9CBA3') + '" stroke-width="' + (mine ? 3 : 1.5) + '"/>' +
        '<text x="' + px.toFixed(1) + '" y="' + (py + 7).toFixed(1) + '" text-anchor="middle" font-size="20">' + x.icon + '</text></g>'; }).join('');
    return '<svg viewBox="0 0 ' + W + ' ' + W + '" class="wl-cmap" role="group" aria-label="Map of connections between the nine inputs">' + lines + nodes + '</svg>';
  }
  function intersectSVG() {
    const W = 340, C = 170, R = 128;
    const parts = INPUTS.map((x, i) => { const a = -Math.PI / 2 + i * 2 * Math.PI / 9, px = C + R * Math.cos(a), py = C + R * Math.sin(a), mine = S.inputs.indexOf(x.id) >= 0;
      return '<line x1="' + px.toFixed(1) + '" y1="' + py.toFixed(1) + '" x2="' + C + '" y2="' + C + '" stroke="#2B5B8C" stroke-width="2" stroke-opacity=".5"/>' +
        '<circle cx="' + px.toFixed(1) + '" cy="' + py.toFixed(1) + '" r="21" fill="#FBF7EC" stroke="' + (mine ? '#3E6B4C' : '#D9CBA3') + '" stroke-width="' + (mine ? 3 : 1.5) + '"/>' +
        '<text x="' + px.toFixed(1) + '" y="' + (py + 7).toFixed(1) + '" text-anchor="middle" font-size="18">' + x.icon + '</text>'; }).join('');
    return '<svg viewBox="0 0 ' + W + ' ' + W + '" class="wl-cmap" role="img" aria-label="All nine inputs meeting in the center at feeling understood">' + parts +
      '<circle cx="' + C + '" cy="' + C + '" r="52" fill="#DCE6F0" stroke="#2B5B8C" stroke-width="2"/>' +
      '<text x="' + C + '" y="' + (C - 4) + '" text-anchor="middle" font-family="Fraunces, Georgia, serif" font-weight="600" font-size="15" fill="#211D17">Feeling</text>' +
      '<text x="' + C + '" y="' + (C + 15) + '" text-anchor="middle" font-family="Fraunces, Georgia, serif" font-weight="600" font-size="15" fill="#211D17">understood</text></svg>';
  }
  function renderConnections() {
    const lv = S.connLevel || 0, f = S.connFocus && IN[S.connFocus] ? S.connFocus : null;
    const shown = CONNECTIONS.filter(cn => (!lv || lv === cn[2]) && (!f || cn[0] === f || cn[1] === f));
    const mine = S.inputs, myPairs = CONNECTIONS.filter(cn => mine.indexOf(cn[0]) >= 0 && mine.indexOf(cn[1]) >= 0).sort((x, y) => x[2] - y[2]);
    const nm = id => IN[id].icon + ' ' + IN[id].name, top = S.topInput && IN[S.topInput], code = codeDone() ? score().code : '';
    const bub = (cn, extra) => '<div class="wl-cbub" style="border-left-color:' + LEVELS[cn[2] - 1].color + '"><p class="wl-pairline">' + nm(cn[0]) + ' + ' + nm(cn[1]) + (extra || '') + '</p><p><strong>' + cn[3] + '.</strong> ' + cn[4] + '</p></div>';
    const arrow = t => '<div class="wl-farrow" aria-hidden="true">' + (t || '↓') + '</div>';
    root.innerHTML =
      '<section class="wl-conn">' +
        '<button type="button" class="wl-linkbtn" id="wl-toresults">← Back to my results</button>' +
        '<h2>How the 9 inputs connect</h2>' +
        '<p>Nobody learns through just one input. Every message you send or receive travels through several at once, and the way they link explains a lot about why some conversations land and others don’t. The connections below start with the obvious ones and climb to the most hidden.</p>' +
        (mine.length ? '<p class="wl-mine"><strong>Your inputs:</strong> ' + mine.map(nm).join(', ') + '.' + (top ? ' Your strongest is ' + nm(top.id) + '.' : '') + (myPairs.length ? ' They link to each other in ' + myPairs.length + ' way' + (myPairs.length > 1 ? 's' : '') + ', listed under “Your connections” further down.' : '') + '</p>'
          : '<p class="wl-mine">You haven’t picked your inputs yet. You can still explore everything here, or go back and choose them with Change answers.</p>') +
        '<h3>The connection map</h3>' +
        '<p>Each line is a connection, colored by level. Tap an input to see only its links, or pick a level. Inputs you chose have a green ring.</p>' +
        '<div class="wl-chips" role="group" aria-label="Filter by level"><button type="button" class="wl-chip" data-lv="0" aria-pressed="' + !lv + '">All levels</button>' + LEVELS.map(L => '<button type="button" class="wl-chip" data-lv="' + L.n + '" aria-pressed="' + (lv === L.n) + '"><span class="wl-sw" style="background:' + L.color + '"></span>' + L.n + '. ' + L.name + '</button>').join('') + '</div>' +
        '<div class="wl-mapbox">' + connMap() + '</div>' +
        '<div class="wl-chips" role="group" aria-label="Focus on one input"><button type="button" class="wl-chip" data-focus="" aria-pressed="' + !f + '">Every input</button>' + INPUTS.map(x => '<button type="button" class="wl-chip" data-focus="' + x.id + '" aria-pressed="' + (f === x.id) + '">' + x.icon + ' ' + x.name + '</button>').join('') + '</div>' +
        (f ? '<p class="wl-mine"><strong>' + nm(f) + ':</strong> ' + IN[f].how + ' <button type="button" class="wl-linkbtn" data-chapter="in-' + f + '">Read its chapter</button></p>' : '') +
        LEVELS.filter(L => !lv || lv === L.n).map(L => { const items = shown.filter(cn => cn[2] === L.n); if (!items.length) return '';
          return '<div class="wl-lvl"><h3><span class="wl-sw" style="background:' + L.color + '"></span>Level ' + L.n + ': ' + L.name + '</h3><p class="wl-lvd">' + L.d + '</p>' + items.map(cn => bub(cn)).join('') + '</div>'; }).join('') +
        (myPairs.length ? '<h3>Your connections</h3><p>These are the links between inputs you chose. They’re the routes where things land most easily for you.</p>' + myPairs.map(cn => bub(cn, ' (level ' + cn[2] + ')')).join('') : '') +
        '<h3>Connections to your Wave Code</h3>' +
        '<p>Each Wave Code letter tends to lean on certain inputs.' + (code ? ' Yours are highlighted.' : '') + '</p>' +
        '<div class="wl-cbub">' + Object.keys(WAVE_LINKS).map(L => '<p class="wl-wl' + (code.indexOf(L) >= 0 ? ' hl' : '') + '"><strong>' + L + ', ' + LETTERS[L].name + ':</strong> ' + WAVE_LINKS[L].map(nm).join(', ') + '</p>').join('') + '</div>' +
        '<h3>Connections to wiring</h3>' +
        '<p>These are common patterns, not rules. Every person is their own mix.</p>' +
        WIRING_LINKS.map(w => '<div class="wl-cbub"><p><strong>' + w[0] + ':</strong> ' + w[1] + '</p></div>').join('') +
        '<h3>Connections to the program’s tools</h3>' +
        TOOL_LINKS.map(t => '<div class="wl-cbub"><p><a href="' + t[1] + '"><strong>' + t[0] + '</strong></a>: ' + t[3] + '</p><p class="wl-pairline">' + t[2].split(',').map(nm).join(' + ') + '</p></div>').join('') +
        '<h3>Flowchart 1: how a message travels</h3>' +
        '<p>Every message passes through the same path. Trouble at any step can scramble it.</p>' +
        '<div class="wl-flow">' +
          '<div class="wl-fnode">💭 A thought or feeling starts in you</div>' + arrow() +
          '<div class="wl-fnode">📤 You send it through your strongest inputs: words, tone, face, actions</div>' + arrow() +
          '<div class="wl-fnode warn">📡 The room adds static: noise, clutter, interruptions</div>' + arrow() +
          '<div class="wl-fnode">🌊 Their nervous system decides how much gets in. Calm means wide open; stressed means narrowed to one input</div>' + arrow() +
          '<div class="wl-fnode">📥 They take it in through their own inputs</div>' + arrow() +
          '<div class="wl-fnode">🧠 They make meaning at their pace, with their lens</div>' + arrow() +
          '<div class="wl-fnode">↩️ They send something back, and the loop starts again</div>' +
        '</div>' +
        '<p>The hidden lesson: under stress, people drop to their single strongest input. That’s why someone who usually hears you fine can suddenly seem not to hear anything. Find their strongest input and send it there.</p>' +
        '<h3>Flowchart 2: when a message doesn’t land</h3>' +
        '<div class="wl-flow">' +
          '<div class="wl-fnode">❓ Did it land the way you meant?</div>' +
          '<div class="wl-fbranch"><div>' + arrow('↓ yes') + '<div class="wl-fnode good">✅ Notice what worked, and use that input again</div></div>' +
          '<div>' + arrow('↓ no') + '<div class="wl-fnode">🌊 Is either of you overloaded?</div>' +
            '<div class="wl-fbranch wl-fbranch-in"><div>' + arrow('↓ yes') + '<div class="wl-fnode warn">⏸️ Pause, settle, and pick a time to come back</div></div>' +
            '<div>' + arrow('↓ no') + '<div class="wl-fnode">📤 Which input did you send it on?</div>' + arrow() + '<div class="wl-fnode">📥 Which input do they take in best?</div>' + arrow() + '<div class="wl-fnode">🔁 Translate and send it again</div></div></div></div></div>' +
        '</div>' +
        '<div class="wl-cbub"><p><strong>Translation examples:</strong> Words to pictures: sketch it. Words to hands: show it by doing it together. Logic to people: say why it matters to both of you. Feelings to logic: name the fact first. Tone to words: say the feeling out loud instead of hoping your voice carries it.</p></div>' +
        '<h3>Flowchart 3: where all nine meet</h3>' +
        '<p>Feeling understood lives at the intersection of all nine inputs. You rarely need all nine at once, but a message that reaches several together gets through even on a hard day.</p>' +
        '<div class="wl-mapbox">' + intersectSVG() + '</div>' +
        '<div class="wl-cbub"><p><strong>The nine-point check before a hard conversation</strong></p><ul class="wl-blist">' + INPUTS.map(x => '<li>' + x.icon + ' <strong>' + x.name + ':</strong> ' + NINE_CHECK[x.id] + '</li>').join('') + '</ul></div>' +
        '<div class="wl-cbub deep"><p><strong>The deepest understanding.</strong> Most conflicts aren’t two people disagreeing. They’re two people sending and receiving on different inputs, through nervous systems with different amounts of room, in a room full of static, while caring a lot. Every tool in this program does one of four things: it makes a signal visible (logic, pictures), calms the receiver (body, inner reflection), clears the room (sound, nature), or names what it all means (words, meaning). People sits in the middle of all of them, because the point of every input is reaching someone.</p></div>' +
        '<p class="wl-evidence">The nine inputs are adapted from Howard Gardner’s idea of multiple intelligences. Treat them as preferences, not fixed learning styles. The connections here are reflection tools drawn from everyday experience and this program’s framework, not a scientific model. For how nine fields of study connect in the program itself, see <a href="/polymath.html">the polymath way</a>.</p>' +
        '<div class="wl-nav"><span></span><button type="button" class="wl-btn" id="wl-finishconn">Back to my results</button></div>' +
      '</section>';
    $$('[data-lv]').forEach(b => { b.onclick = () => { S.connLevel = +b.dataset.lv; save(); redraw(renderConnections, '[data-lv="' + b.dataset.lv + '"]'); }; });
    $$('[data-focus]').forEach(b => { b.onclick = () => { S.connFocus = b.dataset.focus || null; save(); redraw(renderConnections, '[data-focus="' + b.dataset.focus + '"]'); }; });
    $$('.wl-mnode').forEach(g => { const tog = () => { S.connFocus = S.connFocus === g.dataset.node ? null : g.dataset.node; save(); redraw(renderConnections, '.wl-mnode[data-node="' + g.dataset.node + '"]'); };
      g.addEventListener('click', tog); g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tog(); } }); });
    $$('[data-chapter]').forEach(b => { b.onclick = () => openChapter(CHAPTERS.findIndex(c => c.id === b.dataset.chapter)); });
    const back = () => backToResults('#wl-inputs-sect');
    $('#wl-toresults').onclick = back; $('#wl-finishconn').onclick = back;
  }

  // the keep box appears on several screens; one listener handles them all
  root.addEventListener('change', e => {
    if (!e.target.hasAttribute('data-keep')) return;
    S.keep = e.target.checked; save();
    $$('[data-keep]').forEach(x => { x.checked = S.keep; });
    const s = $('#wl-saved'); if (s) s.textContent = S.keep ? 'Saved on this device. “Erase everything” on your results removes it.' : 'Nothing from Wavelength is kept on this device now.';
    const t = $('#wl-toast'); if (t) t.textContent = S.keep ? 'Your answers and journal are kept on this device. “Erase everything” removes them.' : 'Nothing from Wavelength is kept on this device now.';
  });

  render();
  window.TOLWavelength = { code: () => score().code, done: codeDone, insights: () => insights().map(x => x.t), statement: stmtPlain, chapters: () => CHAPTERS.map(c => c.title) };
})();
