/* journey-levels.js — the seven worlds of The Frequency Journey: every level's challenge and
   content, plus the small grid rules engine that the game (frequency-journey.js), the level
   checker (tools/journey/solve.js) and the content checker (tools/journey/check-content.js) use.

   Every level of worlds 1 to 6 is a different kind of challenge, and they get a little harder
   as the journey climbs. d is the difficulty, 1 to 5 (shown as leaves).

   Level fields
     type    riddle · walk (grid) · breath · unscramble · sequence · match · reframe · bloom ·
             bids · balance · echo · sort · fill · spot · choose · maze
     kind    the challenge's name, as the player sees it
     d       difficulty, 1 to 5
     ask     the short instruction shown while playing
     done    the heading on the card after a win
     lesson  the lesson on that card; why = one more plain sentence
     star    a few words for the Harmony moment in the sky
     more    [same-site path, link words] for "Read more"

   Grid tiles (type 'walk', and 'maze')
     .  ground            #  wall (trees, rocks… it depends on the world)
     A  first pal start    B  second pal start      O  the glowing tone (two tiles; both pals stand on it)
     T  thorny shadow: lifts when both pals stand beside it (touching, diagonals too) at the same time
     i  ice: a pal slides until something stops it
     b  ice block: push it; push it into water and it melts into a stepping-stone crossing
     ~  water          _  canyon / open sky (never walkable)
     *  light fragment: gather them all before the tone opens
     p q r  pressure plates     P Q R  bridge pieces over the canyon, up while a pal stands on the plate
                                     (a bridge piece also stays up under a pal who is on it)
     1-5  singing crystals: step on them in the order of the level's melody to clear the murk
     m  grey murk (clears when the melody is complete)
     x  illusion: looks like starry ground but isn't; a pal just bounces gently back
     h  hidden ground: looks like empty sky but is really there
   In a 'maze' level, A is the calling pal on the lookout (she stays put, beside the one O tile)
   and B is the walking pal, who follows the calls you plan.
*/
(function (root) {
  'use strict';

  var WORLDS = [
    { n: 1, hz: 396, name: 'The Whispering Shadows', theme: 'Letting go of fear', short: 'Shadows', mech: 'shadows',
      intro: 'A stormy forest, lit by one small lantern. Here Sugarfoot and Tidbit learn to trust: a few kind riddles, a walk through the dark side by side, and one slow, steady breath.',
      summary: 'Learning to trust: fear gets smaller when you don’t have to carry it alone.',
      levels: [
        { type: 'riddle', kind: 'Lantern riddles', d: 1,
          ask: 'The lantern listens. Answer each riddle and it glows a little brighter.',
          done: 'The lantern glows',
          lesson: 'It’s easier to be brave next to someone you trust.',
          why: 'Fear is a bit like a shadow. It shrinks when you look at it together.',
          star: 'Be brave next to someone you trust',
          more: ['/check-ins.html', 'Check-ins: one topic, same side'],
          riddles: [
            { q: 'The closer Sugarfoot and Tidbit stand, the less of me there is. I grow in the dark when someone hides alone. What am I?',
              hint: 'Think about what a lantern chases away.',
              options: [
                { t: 'A shadow', ok: true, why: 'Yes. A shadow shrinks when two lights stand close, and so does fear.' },
                { t: 'A secret', why: 'Secrets can grow in the dark, it’s true. But this one shrinks when friends stand close.' },
                { t: 'A candle', why: 'A candle is the light, not the answer. Look at what it chases away.' }
              ] },
            { q: 'You can give me away and still keep me. The more of me you give, the more of me there is. What am I?',
              hint: 'It costs nothing, and it’s catching.',
              options: [
                { t: 'A coin', why: 'Give a coin away and it’s gone. This one grows when you share it.' },
                { t: 'A smile', ok: true, why: 'Yes. Give a smile away and you still have it, and now there are two.' },
                { t: 'The last biscuit', why: 'That would be a real gift! But once it’s given, it’s gone.' }
              ] },
            { q: 'I’m lighter than a feather, yet nobody can hold me for more than a minute or two. When you’re scared, I get short and quick. What am I?',
              hint: 'You’re doing it right now.',
              options: [
                { t: 'A worry', why: 'Worries can feel light and still be carried for years. This one can only be held for a moment.' },
                { t: 'A feather', why: 'Close! But the riddle says it’s even lighter than a feather.' },
                { t: 'Your breath', ok: true, why: 'Yes. And letting it out slowly is one of the simplest ways to settle.' }
              ] }
          ] },
        { type: 'walk', kind: 'Lantern walk', d: 1, min: 10,
          ask: 'Bring both pals to the glowing tone. Thorny shadows lift when both pals stand beside them together.',
          done: 'You arrived together',
          lesson: 'Some shadows only lift when you face them together.',
          why: 'Sugarfoot is braver with Tidbit beside her, and Tidbit with Sugarfoot. Staying close doesn’t mean standing still; you can move forward side by side.',
          star: 'Face the shadows together',
          more: ['/turning-toward.html', 'Turning toward each other'],
          rows: [
            '#..#...',
            '.A.#.OO',
            '...#...',
            'B..T...',
            '#..#..#',
            '...#...',
            '..##..#'
          ], tip: 'Bring both pals right up beside the thorny shadow. Together, the shadow lifts.' },
        { type: 'breath', kind: 'The slow lantern', d: 2,
          ask: 'Sugarfoot and Tidbit breathe with the lantern. Breathe along, and tap as it grows fullest, and again as it grows smallest.',
          done: 'Steady and bright',
          lesson: 'Settle first, then take the brave step. A slow breath out is an easy place to start.',
          why: 'Breathing out for longer than you breathe in, four in and six out, is one of the settling steps in the Calm-Down Kit.',
          star: 'Settle first, then be brave',
          more: ['/wp-11.html', 'The Calm-Down Kit'],
          inhale: 4, exhale: 6, need: 5, window: 1.1 }
      ] },

    { n: 2, hz: 417, name: 'The Melting Glaciers', theme: 'Welcoming change', short: 'Glaciers', mech: 'glaciers',
      intro: 'A frozen land, starting to thaw. Words soften, ice melts into new paths, and Sugarfoot and Tidbit practise finding their footing when a talk starts to slide.',
      summary: 'Welcoming change: what was frozen can soften and carry you somewhere new.',
      levels: [
        { type: 'unscramble', kind: 'Thawing words', d: 2,
          ask: 'The letters are frozen out of order. Tap them into place to thaw each word.',
          done: 'The words thaw',
          lesson: 'Change starts small: one brave, steady, curious step.',
          why: 'You don’t have to feel ready. Most new paths begin with a small step taken a little scared.',
          star: 'Brave, steady, curious steps',
          more: ['/quick-checks.html', 'Quick checks: how are you today?'],
          words: [
            { w: 'BRAVE', mix: 'VRAEB', clue: 'Doing the new thing while you’re still a little scared.' },
            { w: 'STEADY', mix: 'DYSEAT', clue: 'How a good friend helps you feel when the ice is slippery.' },
            { w: 'CURIOUS', mix: 'SIUCROU', clue: 'Asking “what could this become?” instead of “why did it change?”' }
          ] },
        { type: 'walk', kind: 'Ice and water', d: 2, min: 13,
          ask: 'Bring both pals to the tone. Push ice blocks into the water to make a crossing.',
          done: 'A new path',
          lesson: 'Old ways of doing things can melt into new paths.',
          why: 'Even the plan for who does what can change. Agreements are allowed to be updated as life does.',
          star: 'Old ways can melt into new paths',
          more: ['/wp-03.html', 'One owner per job (and changing the plan)'],
          rows: [
            'A..#...',
            '.b.#.OO',
            '.......',
            '##~~~##',
            '.......',
            'B.b....',
            '..#..#.'
          ], tip: 'Push an ice block into the water. It melts into a little stepping-stone crossing.' },
        { type: 'sequence', kind: 'Find your footing', d: 3,
          ask: 'A talk has started to slide. Put the retuning steps in order: tap each one in turn, then check.',
          done: 'Back in tune',
          lesson: 'Sometimes you slide further than you planned. Name it, slow down, and find your footing together.',
          why: 'Two kind people can sound sharp together, like two radios slightly out of tune. Nobody is broken; you just retune.',
          star: 'Name it, slow down, retune',
          more: ['/book/chapter-1.html', 'Chapter I: two radios, one squeal'],
          steps: [
            { t: 'Notice the talk has started to turn sharp.', why: 'You can’t retune until you notice you’re out of tune. It comes first.' },
            { t: 'Say it without blame: “I think we’re on different frequencies.”', why: 'Naming it kindly, for both of you, comes right after noticing it.' },
            { t: 'Check your own state. How full is your battery?', why: 'Once it’s named, each person checks themselves, not the other one.' },
            { t: 'Slow everything down: your pace, your voice, one long breath.', why: 'Slowing down comes after checking in, so you know how much you need.' },
            { t: 'Go back to the one topic you started with.', why: 'The topic comes last, once you’re both back in tune.' }
          ] }
      ] },

    { n: 3, hz: 528, name: 'The Golden Meadow', theme: 'Joy, and being kind to yourself', short: 'Meadow', mech: 'meadow',
      intro: 'A sunny field full of flowers. Here Sugarfoot and Tidbit practise being kind to themselves: matching feelings with what helps, finding kinder words, and letting the whole meadow bloom.',
      summary: 'Joy and self-kindness: you deserve the same warmth you give to others.',
      levels: [
        { type: 'match', kind: 'What would help?', d: 3,
          ask: 'Turn over two cards at a time. Match each feeling with what would help it most.',
          done: 'Every feeling met',
          lesson: 'Be as kind to yourself as you would be to your best friend.',
          why: 'Noticing how you are is the first step. The second is offering yourself what you’d offer them.',
          star: 'Be your own best friend',
          more: ['/quick-checks.html', 'Today’s Weather: a one-minute check'],
          pairs: [
            { a: 'Tired', b: 'An early night', why: 'Tired asks for rest, not for trying harder.' },
            { a: 'Overwhelmed', b: 'One thing at a time', why: 'When it’s all too much, a smaller list helps.' },
            { a: 'Unseen', b: 'A specific thank-you', why: 'Being thanked for the exact thing you did is how quiet work gets seen.' },
            { a: 'Lonely', b: 'A little company', why: 'Even ten minutes together can help.' },
            { a: 'Worried', b: 'A plan for the next step', why: 'A worry often softens once there’s one clear next step.' },
            { a: 'Wound up', b: 'A long, slow breath out', why: 'Settle the body first. Then the rest is easier.' }
          ] },
        { type: 'reframe', kind: 'Kinder, truer words', d: 3,
          ask: 'A harsh thought pops up. Choose the way of saying it that is both kinder and true.',
          done: 'Kind and true',
          lesson: 'The kind thought is also a true one. You don’t have to pretend everything is fine.',
          why: 'Being kind to yourself isn’t forced cheerfulness. It’s telling yourself the truth, gently.',
          star: 'Kind words can also be true',
          more: ['/check-ins.html', 'Check-ins: turning a rough moment into a habit'],
          items: [
            { harsh: 'I ruined the whole evening.',
              options: [
                { t: 'I always ruin everything.', why: 'That’s harsher, and “always” and “everything” aren’t true.' },
                { t: 'One part of the evening went badly. I can say sorry for that part and still enjoy the rest.', ok: true, why: 'Kind and true: it names the real part, and leaves room to put it right.' },
                { t: 'The evening was perfect. Nothing went wrong at all.', why: 'That’s kind, but it isn’t true. Pretending doesn’t help you put it right.' }
              ] },
            { harsh: 'I’m so behind. Everyone else has it together.',
              options: [
                { t: 'I’m not behind at all. Lists are pointless anyway.', why: 'It sounds cheerful, but it isn’t quite true, and it won’t help the list.' },
                { t: 'I’m hopeless at life.', why: 'That’s the harsh thought again, just bigger.' },
                { t: 'I’m behind on a few things this week. Tomorrow I can pick the one that matters most.', ok: true, why: 'True and kind: a few things, this week, and one small next step.' }
              ] },
            { harsh: 'I shouldn’t need a rest. I haven’t done enough to deserve one.',
              options: [
                { t: 'Rest isn’t a prize. I’m tired, and a break will help me do the next thing.', ok: true, why: 'Yes. Rest isn’t something you earn. It’s something you need.' },
                { t: 'Rest is only for people who’ve earned it.', why: 'That’s the same harsh rule, said more firmly.' },
                { t: 'I never need rest. I can keep going forever.', why: 'Nobody can, and that’s fine. Everyone’s battery needs topping up.' }
              ] },
            { harsh: 'I had to ask for help, so I must be weak.',
              options: [
                { t: 'I didn’t really need help. I just asked to be polite.', why: 'That hides the truth. Needing help is normal.' },
                { t: 'Asking for help is how two people share a load. It took some courage.', ok: true, why: 'Yes. Asking clearly is a strength, and it lets someone help you well.' },
                { t: 'Real grown-ups never ask for anything.', why: 'Everyone needs help sometimes. Saying so is a skill, not a failing.' }
              ] }
          ] },
        { type: 'bloom', kind: 'Let the meadow bloom', d: 3,
          ask: 'Tap a flower to open it. Each tap also touches its neighbours above, below and beside it. Can you open them all?',
          done: 'The whole meadow blooms',
          lesson: 'Little moments of light add up, and each kindness reaches the ones around it.',
          why: 'Small, specific things done often, like a real hello or a thank-you, change how a whole week feels.',
          star: 'Little moments add up',
          more: ['/turning-toward.html', 'Turning toward, in tiny moments'],
          start: ['000', '111', '010'] }
      ] },

    { n: 4, hz: 639, name: 'The Bridge of Echoes', theme: 'Connection', short: 'Bridge', mech: 'bridge',
      intro: 'A deep canyon with echoes on the wind. Here Sugarfoot and Tidbit practise connection: noticing small reaches, sharing the load fairly, and holding steady for each other.',
      summary: 'Connection: we each walk our own path, and we make each other’s paths possible.',
      levels: [
        { type: 'bids', kind: 'Small reaches', d: 3,
          ask: 'An ordinary Tuesday evening. Tap each moment where Ren reaches out for connection, then check.',
          done: 'You turned toward',
          lesson: 'Closeness is built in tiny moments: noticing a small reach, and reaching back.',
          why: 'A sigh, a “look at this”, an offer of tea: each is a small bid. Turning toward it, even for ten seconds, says “you matter to me”.',
          star: 'Notice the small reaches',
          more: ['/turning-toward.html', 'Turning Toward'],
          scene: [
            { t: 'Ren comes in, drops their keys, and sighs: “What a day.”', bid: true, why: 'A sigh out loud is a small bid. It invites a “what happened?”' },
            { t: 'The kettle clicks off in the kitchen.', why: 'That’s just the kettle. Not every moment is a reach.' },
            { t: 'Ren holds up their phone: “Look at this dog in a raincoat.”', bid: true, why: '“Look at this” is one of the clearest bids there is.' },
            { t: 'The rain gets heavier against the window.', why: 'Just the weather. Nobody is reaching here.' },
            { t: 'Ren asks, “Do you want a tea? I’m making one.”', bid: true, why: 'An offer is a bid too. It’s a small way of saying “I’m thinking of you”.' },
            { t: 'Ren sits down and opens the post.', why: 'Ren is busy with the post here, not reaching for you.' },
            { t: 'On the way past, Ren rests a hand on your shoulder.', bid: true, why: 'A touch in passing is a quiet bid for connection.' }
          ],
          reply: { q: 'Ren sighs, “What a day.” Which answer turns toward the bid?',
            options: [
              { t: '“Mm.” (without looking up)', why: 'That’s turning away. It isn’t unkind, but the reach gets missed.' },
              { t: 'Look up: “Oh no. Come and sit. What happened?”', ok: true, why: 'Yes. Looking up and asking one question is turning toward.' },
              { t: '“At least you’ve got a job.”', why: 'That brushes the feeling aside. It can land as turning against.' },
              { t: '“My day was worse, listen to this.”', why: 'Your day matters too, but this turns the moment away from them. Ask first; your turn will come.' }
            ] } },
        { type: 'balance', kind: 'Fair shares', d: 4,
          ask: 'Give every job one owner: Sugarfoot or Tidbit. Fair here means a load that fits each one’s battery this week, and invisible work counts too.',
          done: 'A fair split',
          lesson: 'Fair isn’t always 50/50. It’s every job with one clear owner, and a load that fits you both this week.',
          why: 'Work that belongs to everyone ends up belonging to no one. And the noticing and remembering is work too.',
          star: 'One clear owner, a load that fits',
          more: ['/wp-03.html', 'One owner per job (WP-03)'],
          cap: [10, 8], capNote: ['a quieter week', 'a busy week at work'],
          jobs: [
            { t: 'Cooking dinners', w: 4 },
            { t: 'Washing up', w: 2 },
            { t: 'Laundry', w: 3 },
            { t: 'Evening walks', w: 3 },
            { t: 'Taking out the bins', w: 1 },
            { t: 'School forms and the calendar', w: 2, hidden: true },
            { t: 'Noticing the milk is low', w: 1, hidden: true },
            { t: 'Remembering birthdays', w: 2, hidden: true }
          ] },
        { type: 'walk', kind: 'Bridge plates', d: 4, min: 19,
          ask: 'Bring both pals to the tone. A pal on a plate raises the matching bridge for the other. Sugarfoot and Tidbit take turns.',
          done: 'Across together',
          lesson: 'Holding steady for a friend is a quiet kind of love.',
          why: 'Sugarfoot waits on a plate so Tidbit can cross, then Tidbit does the same. What you do on your side changes the path for someone else.',
          star: 'Hold steady for each other',
          more: ['/relationships.html', 'Relationships of every kind'],
          rows: [
            '...._OO',
            '.A.._..',
            '..p.P..',
            '...._..',
            'B..._q.',
            '...._..',
            '....Q..'
          ], tip: 'One pal stands on the plate to raise the bridge. The other crosses, then finds a plate to bring their pal over.' }
      ] },

    { n: 5, hz: 741, name: 'The Singing Valleys', theme: 'Finding your voice', short: 'Valleys', mech: 'valleys',
      intro: 'Giant crystals hum in the valley wind. Here Sugarfoot and Tidbit practise their voice: listening first, sorting what to say, and finishing the lines that help words land.',
      summary: 'Finding your voice: listen closely, speak clearly, and the fog lifts.',
      levels: [
        { type: 'echo', kind: 'Echo the valley', d: 4,
          ask: 'Tidbit plays a tune on the crystals and Sugarfoot listens. Sing the same tune back. Each round, it grows by one note.',
          done: 'The valley sings back',
          lesson: 'Listening first makes it easier to find the right words.',
          why: 'In a check-in, one person speaks and the other says back what they heard before answering. Echoing is a kind of respect.',
          star: 'Listen first',
          more: ['/check-ins.html', 'Check-ins: hear it back before you answer'],
          song: [1, 3, 2, 5, 4, 2], first: 3 },
        { type: 'sort', kind: 'Fact, feeling, ask', d: 4,
          ask: 'Sort each sentence. Is it a plain fact, a feeling, a clear ask, or a verdict dressed up as a fact?',
          done: 'Said so it lands',
          lesson: 'Say it so it lands: a fact without adjectives, the feeling underneath, and a clear ask.',
          why: 'A verdict like “you never help” is about the person, and it starts a fight about who they are. A fact, a feeling and an ask start a conversation.',
          star: 'Fact, feeling, ask',
          more: ['/wp-09.html', 'Say it so it lands (WP-09)'],
          buckets: [
            { k: 'fact', t: 'Fact', d: 'What happened, no adjectives' },
            { k: 'feeling', t: 'Feeling', d: 'How it landed for me' },
            { k: 'ask', t: 'Ask', d: 'What I’d like next' },
            { k: 'verdict', t: 'Verdict', d: 'A judgement of the person' }
          ],
          items: [
            { t: 'The sink was full at seven this morning.', k: 'fact', why: 'It’s something anyone could have seen. No adjectives, no blame.' },
            { t: 'I felt let down, and a bit alone with it.', k: 'feeling', why: 'It says how it landed for you. Nobody can argue with that.' },
            { t: 'Could we clear the sink before bed?', k: 'ask', why: 'A clear, doable request about what happens next.' },
            { t: 'You never help with anything.', k: 'verdict', why: '“Never” and “anything” turn one event into a judgement of the person.' },
            { t: 'The call we planned for eight didn’t happen.', k: 'fact', why: 'Plain and checkable: what was planned, and what happened.' },
            { t: 'I got anxious when the plan changed.', k: 'feeling', why: 'It names your own feeling, starting with “I”.' },
            { t: 'Can we pick a time for the call tomorrow?', k: 'ask', why: 'It asks for something specific, with a real time in it.' },
            { t: 'You obviously don’t care about this.', k: 'verdict', why: 'It guesses at what’s inside the other person and calls it obvious.' },
            { t: 'Would you take the bins out on Thursdays?', k: 'ask', why: 'A clear ask, with a day in it. Easy to say yes or no to.' },
            { t: 'The bins went out late twice this week.', k: 'fact', why: 'It counts what happened, without saying what it means about anyone.' }
          ] },
        { type: 'fill', kind: 'Finish the line', d: 5,
          ask: 'Each line is from the program, with one word missing. Type the word. A hint is always there.',
          done: 'Every line finished',
          lesson: 'Your voice matters. Plain, specific words help what you mean arrive as you meant it.',
          why: 'Say the request as a request, put a real time on it, and keep to one thing at a time.',
          star: 'Plain words, clearly said',
          more: ['/wired-differently.html', 'Wired Differently: words that arrive'],
          lines: [
            { before: '“Tomorrow after dinner” is a return time. “', after: '” isn’t.', a: ['later'], choices: ['Later', 'Tonight', 'Soon'], hint: 'It’s the vaguest word for “not now”.', why: 'A return time names when. “Later” leaves the other person waiting and wondering.' },
            { before: 'A complaint is about the event. Criticism is about the ', after: '.', a: ['person'], choices: ['weather', 'person', 'money'], hint: 'Criticism aims at who someone is.', why: '“The sink was full” is about the event. “You’re careless” is about the person.' },
            { before: 'What you meant and how it ', after: ' can both be true.', a: ['landed', 'lands', 'felt'], choices: ['started', 'landed', 'ended'], hint: 'Think of a plane arriving.', why: 'Good intent doesn’t cancel the impact. You can hold both.' },
            { before: 'Work that belongs to everyone ends up belonging to ', after: '.', a: ['no one', 'noone', 'nobody', 'no-one'], choices: ['no one', 'someone', 'the kids'], hint: 'Two words: the opposite of everyone.', why: 'Shared jobs with no named owner quietly land on whoever notices first.' },
            { before: 'Regulate first, ', after: ' second.', a: ['negotiate'], choices: ['apologise', 'negotiate', 'celebrate'], hint: 'It’s what you do when you work out a deal together.', why: 'A calm body can hear a hard sentence. A revved-up one hears an attack.' },
            { before: '“Thanks for everything” is nice. A ', after: ' thank-you is better.', a: ['specific'], choices: ['loud', 'quick', 'specific'], hint: 'It names the exact thing someone did.', why: '“Thanks for sorting the school forms on your lunch break” shows you noticed.' }
          ] }
      ] },

    { n: 6, hz: 852, name: 'The Starry Summit', theme: 'Seeing clearly', short: 'Summit', mech: 'summit',
      intro: 'A night climb on paths made of constellations. Here Sugarfoot and Tidbit practise seeing clearly: telling what you saw from the story you added, choosing well when it’s hard, and trusting clear calls in the dark.',
      summary: 'Seeing clearly: looking past what seems true to what is true.',
      levels: [
        { type: 'spot', kind: 'Seen, or assumed?', d: 5,
          ask: 'Tap every part that is a story you’re adding, not something you actually saw or heard. Then check.',
          done: 'Seeing clearly',
          lesson: 'Separate what you saw from the story you added. Then, gently, ask about the story.',
          why: 'When two people read the same moment differently, the gap usually runs both ways. Checking beats guessing.',
          star: 'What I saw, not the story',
          more: ['/wired-differently.html', 'Wired Differently: a text, read twice'],
          scenes: [
            { title: 'Seven o’clock',
              bits: [
                { t: 'Jo got home at seven.', why: 'A time you can check. Seen.' },
                { t: 'She didn’t say hello.', why: 'You heard no hello. That really happened.' },
                { t: 'She’s angry with me.', story: true, why: 'Nobody said that. It’s a guess about what’s inside her.' },
                { t: 'Her coat is still on.', why: 'You can see the coat. Seen.' },
                { t: 'She didn’t look at me.', why: 'Where her eyes went is something you saw.' },
                { t: 'She’s avoiding my eyes on purpose.', story: true, why: '“On purpose” is a story about why. She might just be tired.' },
                { t: 'She went straight upstairs.', why: 'You watched her go. Seen.' },
                { t: 'She doesn’t want to talk to me.', story: true, why: 'Maybe, maybe not. That’s one to ask about, kindly.' }
              ] },
            { title: 'One word',
              bits: [
                { t: 'The reply says “Fine.”', why: 'Those are the actual words. Seen.' },
                { t: 'It ends with a full stop.', why: 'The full stop is really there.' },
                { t: 'That means they’re upset.', story: true, why: 'For some people a full stop is just a full stop. This is a reading, not a fact.' },
                { t: 'They replied within two minutes.', why: 'The time is on the screen. Seen.' },
                { t: 'They’re only being polite so I’ll drop it.', story: true, why: 'A guess about their reasons. You could ask instead.' }
              ] }
          ] },
        { type: 'choose', kind: 'What would help most?', d: 5,
          ask: 'Four small, real moments. For each one, choose what would help most. Every option explains itself.',
          done: 'Clear sight, kind choices',
          lesson: 'Seeing clearly is also asking clearly: check the story, name a time, keep the door open.',
          why: 'None of these is about winning. Each good choice keeps both people on the same side.',
          star: 'Keep the door open',
          more: ['/check-ins.html', 'Check-ins'],
          items: [
            { q: 'Mid-disagreement, you want to keep talking until it’s sorted. The other person has gone quiet and says they need some space.',
              options: [
                { t: 'Keep going, gently. If you stop now it’ll never get sorted.', why: 'Pushing on when someone has asked for space tends to make them close up more.' },
                { t: 'Walk away without a word, so they get their space.', why: 'Leaving with no word can feel like being left. Space works better with a time on it.' },
                { t: 'Agree to pause, and name a time: “Let’s take twenty minutes and come back at half past. I’m not going anywhere.”', ok: true, why: 'Yes. It meets both needs: space for one, a clear return for the other.' },
                { t: '“Fine. Forget it, then.”', why: 'That closes the door. The topic is still there tomorrow, now with a sting.' }
              ] },
            { q: 'The recycling has been missed three weeks running. Nobody has been ill or away. What’s the most useful next step?',
              options: [
                { t: 'Put it down to a busy patch and say nothing.', why: 'That fits a one-off with a clear cause, like illness or travel. Three weeks with no cause is a pattern.' },
                { t: 'Quietly start doing it yourself from now on.', why: 'Kind, but now it’s invisible work nobody agreed to. It tends to build up.' },
                { t: 'Treat it as a gap in the plan: agree one clear owner for recycling.', ok: true, why: 'Yes. A job that keeps slipping usually has no clear owner. That’s a fix, not a fault.' },
                { t: 'Keep a private list of each missed week, just in case.', why: 'A list only one person reads is scorekeeping. Bring it to a shared talk instead.' }
              ] },
            { q: 'You’re running on empty. Someone you love asks you to host a family lunch this Sunday. What’s the kindest honest answer?',
              options: [
                { t: '“Sure, no problem!” (and quietly dread it all week)', why: 'It sounds kind, but it isn’t honest, and the tiredness will show up somewhere.' },
                { t: '“I can see why you’d ask, and I know it matters to you. I’m running on empty this week. Could we do a short coffee instead, or host next month?”', ok: true, why: 'Yes: acknowledge, say what you honestly have left, and offer something instead of a flat no.' },
                { t: '“No. I can’t believe you’d even ask.”', why: 'The no might be right, but this lands as an attack on them for asking.' },
                { t: '“Maybe… we’ll see.”', why: 'Vague answers leave them planning around a question mark. A clear, kind no is easier to hear.' }
              ] },
            { q: 'You send a long, careful message. The reply is just “Fine.” You feel a small jolt. What helps most?',
              options: [
                { t: 'Reply “Fine.” back.', why: 'Now you’re both guessing, and the chill grows.' },
                { t: 'Decide they’re upset, and stay quiet all evening.', why: 'That acts on a story you haven’t checked. They may have meant a simple yes.' },
                { t: 'Send three more messages explaining yourself.', why: 'It’s a very human reach, but it can feel like pressure. One plain question works better.' },
                { t: 'Ask plainly: “Just checking: is ‘fine’ a yes, or is something up? Either is okay.”', ok: true, why: 'Yes. People read short messages differently. One kind, plain question clears it up.' }
              ] }
          ] },
        { type: 'maze', kind: 'Calls in the dark', d: 5, maxCalls: 10, maxRun: 6, minCalls: 7,
          ask: 'In the dark, Tidbit can’t see the path. From the lookout, Sugarfoot can. Plan clear calls for Tidbit (which way, how many steps), then call them out.',
          done: 'Guided home',
          lesson: 'Trust what you know, even when the path is hard to see, and give clear calls to someone who can’t see what you see.',
          why: 'Clear, specific words (which way, how many, when) are a gift to someone who is walking in the dark.',
          star: 'Clear calls in the dark',
          more: ['/wired-differently.html', 'Ten rules for every wiring'],
          rows: [
            '___AO__',
            '_...h._',
            '_x_#x._',
            '_x...._',
            '_.#.#._',
            '_x_..x_',
            '_..h.._',
            '_B.____'
          ] }
      ] },

    { n: 7, hz: 963, name: 'The Infinite Sky', theme: 'The Perfect Frequency', short: 'Sky', mech: 'sky',
      intro: 'Sugarfoot and Tidbit made it, together and still themselves. There’s nothing left to solve. Tap the sky to place stars that chime, and the pals will float over to play.',
      lessons: ['You made it together, and you’re still wholly yourselves.'],
      summary: 'The Perfect Frequency: stay as long as you like. This is a place to rest.',
      levels: [] }
  ];

  /* ------------------------------------------------------------------ the engine */
  var DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]]; // up, right, down, left
  var FLOORISH = '.ABhi*O12345pqr'; // tiles a pal can stand on (given no other rules)

  function parse(level, world) {
    var rows = level.rows, H = rows.length, W = rows[0].length, g = [], L = {
      W: W, H: H, g: g, a: -1, b: -1, blocks: [], goal: [], water: [], thorns: [], frags: [], murk: [],
      melody: level.melody || [], world: world
    };
    for (var y = 0; y < H; y++) {
      if (rows[y].length !== W) throw new Error('Ragged row ' + y + ' in world ' + world);
      for (var x = 0; x < W; x++) {
        var c = rows[y][x], i = y * W + x;
        if (c === 'A') { L.a = i; c = '.'; }
        else if (c === 'B') { L.b = i; c = '.'; }
        else if (c === 'b') { L.blocks.push(i); c = '.'; }
        if (c === 'O') L.goal.push(i);
        if (c === '~') L.water.push(i);
        if (c === 'T') L.thorns.push(i);
        if (c === '*') L.frags.push(i);
        if (c === 'm') L.murk.push(i);
        g.push(c);
      }
    }
    return L;
  }

  function init(L) { return { a: L.a, b: L.b, k: L.blocks.slice().sort(num), wm: 0, tm: 0, fm: 0, pr: 0, mc: 0 }; }
  function num(x, y) { return x - y; }
  function clone(S) { return { a: S.a, b: S.b, k: S.k.slice(), wm: S.wm, tm: S.tm, fm: S.fm, pr: S.pr, mc: S.mc }; }
  function key(S) { return S.a + ',' + S.b + '|' + S.k.join(',') + '|' + S.wm + '|' + S.tm + '|' + S.fm + '|' + S.pr + '|' + S.mc; }
  function pal(S, w) { return w ? S.b : S.a; }
  function nb(L, i, d) {
    var x = i % L.W + DIRS[d][0], y = (i / L.W | 0) + DIRS[d][1];
    return x < 0 || y < 0 || x >= L.W || y >= L.H ? -1 : y * L.W + x;
  }
  function cheb(L, i, j) { return Math.max(Math.abs(i % L.W - j % L.W), Math.abs((i / L.W | 0) - (j / L.W | 0))); }
  function melted(L, S, i) { var k = L.water.indexOf(i); return k >= 0 && (S.wm >> k & 1) === 1; }
  function pressed(L, S, letter) { return L.g[S.a] === letter || L.g[S.b] === letter; }

  // can a pal stand on tile i (ignoring pals and blocks)? why = reason it can't
  function ground(L, S, i, who) {
    if (i < 0) return 'edge';
    var c = L.g[i];
    if (FLOORISH.indexOf(c) >= 0) return '';
    if (c === '~') return melted(L, S, i) ? '' : 'water';
    if (c === 'T') return (S.tm >> L.thorns.indexOf(i) & 1) ? '' : 'thorn';
    if (c === 'm') return S.mc ? '' : 'murk';
    if (c === 'x') return 'illusion';
    if (c === 'P' || c === 'Q' || c === 'R') {
      if (pressed(L, S, c.toLowerCase())) return '';
      if (pal(S, 1 - who) === i || pal(S, who) === i) return ''; // a bridge piece holds under a pal
      return 'bridge';
    }
    if (c === '#') return 'wall';
    return 'gap';
  }
  // can an ice block rest on tile i?
  function blockGround(L, S, i) {
    if (i < 0) return false;
    var c = L.g[i];
    return c === '.' || c === 'i' || (c === '~' && melted(L, S, i));
  }

  // enter a tile: gather, sing, reveal
  function enter(L, S, i, who, ev) {
    var c = L.g[i];
    if (c === '*') { var f = L.frags.indexOf(i); if (!(S.fm >> f & 1)) { S.fm |= 1 << f; ev.push({ t: 'frag', i: i, who: who, all: S.fm === (1 << L.frags.length) - 1 }); } }
    else if (c >= '1' && c <= '5') {
      var n = +c;
      if (S.mc) ev.push({ t: 'note', i: i, n: n, who: who, free: true });
      else if (L.melody[S.pr] === n) {
        S.pr++;
        ev.push({ t: 'note', i: i, n: n, who: who, ok: true, pr: S.pr });
        if (S.pr === L.melody.length) { S.mc = 1; ev.push({ t: 'clear' }); }
      } else {
        S.pr = L.melody[0] === n ? 1 : 0;
        ev.push({ t: 'note', i: i, n: n, who: who, ok: false, pr: S.pr });
      }
    } else if (c === 'h') ev.push({ t: 'hidden', i: i });
  }

  // one pal tries one step
  function stepOne(L, S, who, d, ev, paths) {
    var from = pal(S, who), t = nb(L, from, d), other = pal(S, 1 - who);
    if (t < 0) return false;
    if (t === other) { ev.push({ t: 'bump', who: who, i: t }); return false; }
    var why = ground(L, S, t, who);
    if (why) { ev.push({ t: why === 'illusion' ? 'bounce' : 'bump', why: why, who: who, i: t }); return false; }
    var bk = S.k.indexOf(t);
    if (bk >= 0) {
      var u = nb(L, t, d);
      if (u < 0 || u === other || u === from || S.k.indexOf(u) >= 0) { ev.push({ t: 'bump', why: 'block', who: who, i: t }); return false; }
      if (L.g[u] === '~' && !melted(L, S, u)) {
        S.k.splice(bk, 1); S.wm |= 1 << L.water.indexOf(u);
        ev.push({ t: 'melt', from: t, i: u, who: who });
      } else if (blockGround(L, S, u)) {
        S.k[bk] = u; S.k.sort(num);
        ev.push({ t: 'push', from: t, i: u, who: who });
      } else { ev.push({ t: 'bump', why: 'block', who: who, i: t }); return false; }
    }
    var path = [from, t];
    if (who) S.b = t; else S.a = t;
    enter(L, S, t, who, ev);
    // slide across ice
    var cur = t, guard = 0;
    while (L.g[cur] === 'i' && guard++ < 99) {
      var n = nb(L, cur, d);
      if (n < 0 || n === pal(S, 1 - who) || S.k.indexOf(n) >= 0 || ground(L, S, n, who)) break;
      cur = n; path.push(n);
      if (who) S.b = n; else S.a = n;
      enter(L, S, n, who, ev);
    }
    if (path.length > 2) ev.push({ t: 'slide', who: who });
    paths[who] = path;
    return true;
  }

  // who: 0, 1, or 2 (both together). Returns { s, ev, paths, moved } — s is a fresh state.
  function step(L, S0, who, d) {
    var S = clone(S0), ev = [], paths = [null, null], moved = false;
    if (who === 2) {
      var dx = DIRS[d][0], dy = DIRS[d][1];
      var pa = (S.a % L.W) * dx + (S.a / L.W | 0) * dy, pb = (S.b % L.W) * dx + (S.b / L.W | 0) * dy;
      var order = pa >= pb ? [0, 1] : [1, 0];
      order.forEach(function (w) { if (stepOne(L, S, w, d, ev, paths)) moved = true; });
    } else moved = stepOne(L, S, who, d, ev, paths);
    if (moved) {
      L.thorns.forEach(function (ti, k) {
        if (!(S.tm >> k & 1) && cheb(L, S.a, ti) <= 1 && cheb(L, S.b, ti) <= 1) { S.tm |= 1 << k; ev.push({ t: 'lift', i: ti }); }
      });
    }
    return { s: S, ev: ev, paths: paths, moved: moved };
  }

  function allFrags(L, S) { return S.fm === (1 << L.frags.length) - 1; }
  function won(L, S) { return allFrags(L, S) && L.goal.indexOf(S.a) >= 0 && L.goal.indexOf(S.b) >= 0; }

  // breadth-first search for the fewest moves. Actions are [who, dir]; who 2 = together.
  function solve(L, S0, maxNodes) {
    S0 = S0 || init(L); maxNodes = maxNodes || 2e6;
    var start = key(S0); if (won(L, S0)) return [];
    var seen = new Map(); seen.set(start, null);
    var q = [S0], keys = [start], head = 0;
    while (head < q.length) {
      if (seen.size > maxNodes) return null;
      var S = q[head], k0 = keys[head]; head++;
      for (var who = 0; who < 3; who++) for (var d = 0; d < 4; d++) {
        var r = step(L, S, who, d); if (!r.moved) continue;
        var k = key(r.s); if (seen.has(k)) continue;
        seen.set(k, [k0, who, d]);
        if (won(L, r.s)) {
          var out = [], cur = k;
          while (seen.get(cur)) { var e = seen.get(cur); out.unshift([e[1], e[2]]); cur = e[0]; }
          return out;
        }
        q.push(r.s); keys.push(k);
      }
    }
    return false; // unsolvable
  }


  /* ------------------------------------------------------------------ helpers for the other challenges
     (shared with tools/journey/check-content.js, so the checker tests the same rules the game uses) */

  // "Let the meadow bloom": a tap opens or closes a flower and its neighbours above, below and beside it.
  function bloomTap(bits, i, n) {
    n = n || 3; var out = bits.slice(), x = i % n, y = i / n | 0;
    [[0, 0], [0, -1], [1, 0], [0, 1], [-1, 0]].forEach(function (o) {
      var xx = x + o[0], yy = y + o[1];
      if (xx >= 0 && yy >= 0 && xx < n && yy < n) out[yy * n + xx] ^= 1;
    });
    return out;
  }
  function bloomBits(rows) { return rows.join('').split('').map(Number); }
  // fewest taps from here to a meadow in full bloom (null if it can't be done)
  function bloomSolve(bits, n) {
    n = n || 3; var N = n * n, full = (1 << N) - 1;
    function enc(b) { var v = 0; b.forEach(function (x, i) { if (x) v |= 1 << i; }); return v; }
    var masks = []; for (var i = 0; i < N; i++) { var z = []; for (var k = 0; k < N; k++) z.push(0); masks.push(enc(bloomTap(z, i, n))); }
    var s0 = enc(bits); if (s0 === full) return [];
    var prev = new Map(); prev.set(s0, null); var q = [s0], h = 0;
    while (h < q.length) {
      var s = q[h++];
      for (i = 0; i < N; i++) {
        var t = s ^ masks[i]; if (prev.has(t)) continue; prev.set(t, [s, i]);
        if (t === full) { var out = [], c = t; while (prev.get(c)) { out.unshift(prev.get(c)[1]); c = prev.get(c)[0]; } return out; }
        q.push(t);
      }
    }
    return null;
  }

  // "Calls in the dark": the calling pal (A) waits on the lookout, which counts as one of the two tone tiles.
  function mazeParse(lv) { var L = parse(lv, 6); L.goal = [L.a].concat(L.goal); L.maze = true; return L; }
  // walk a list of calls [dir, steps]; stops at the first step that can't be taken
  function mazeWalk(L, calls) {
    var S = init(L), path = [S.b], stop = -1, ev = [];
    for (var c = 0; c < calls.length && stop < 0; c++) {
      for (var k = 0; k < calls[c][1]; k++) {
        var r = step(L, S, 1, calls[c][0]);
        if (!r.moved) { stop = c; ev = r.ev; break; }
        S = r.s; path.push(S.b);
      }
    }
    return { s: S, path: path, stop: stop, ev: ev, won: stop < 0 && won(L, S) };
  }
  // fewest calls (each call: one direction, 1 to maxRun steps)
  function mazeSolve(L, maxRun, from) {
    maxRun = maxRun || 6;
    var S0 = from || init(L), prev = {}, q = [S0], h = 0; prev[S0.b] = null;
    if (won(L, S0)) return [];
    while (h < q.length) {
      var S = q[h++];
      for (var d = 0; d < 4; d++) {
        var cur = S;
        for (var n = 1; n <= maxRun; n++) {
          var r = step(L, cur, 1, d); if (!r.moved) break; cur = r.s;
          if (prev[cur.b] !== undefined) continue;
          prev[cur.b] = [S.b, d, n];
          if (won(L, cur)) { var out = [], c = cur.b; while (prev[c]) { out.unshift([prev[c][1], prev[c][2]]); c = prev[c][0]; } return out; }
          q.push(cur);
        }
      }
    }
    return null;
  }

  // "Finish the line": forgiving matching. Case, spaces, quotes and a small typo are all fine.
  function norm(s) { return String(s || '').toLowerCase().replace(/[’'"“”.,!?;:()\-]/g, ' ').replace(/\s+/g, ' ').trim(); }
  function lev(a, b) {
    var m = a.length, n = b.length, d = [], i, j;
    for (i = 0; i <= m; i++) { d[i] = [i]; }
    for (j = 0; j <= n; j++) d[0][j] = j;
    for (i = 1; i <= m; i++) for (j = 1; j <= n; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return d[m][n];
  }
  function fillMatch(line, typed) {
    var t = norm(typed); if (!t) return false;
    return line.a.some(function (a) { a = norm(a); return t === a || t.replace(/ /g, '') === a.replace(/ /g, '') || (a.length >= 5 && lev(t, a) <= 1); });
  }

  function levelOf(w, l) { var W = WORLDS[w - 1]; return W && W.levels[l - 1]; }

  var api = { WORLDS: WORLDS, DIRS: DIRS, parse: parse, init: init, clone: clone, key: key, step: step, won: won, allFrags: allFrags,
    solve: solve, ground: ground, melted: melted, pressed: pressed, nb: nb, cheb: cheb,
    bloomTap: bloomTap, bloomBits: bloomBits, bloomSolve: bloomSolve, mazeParse: mazeParse, mazeWalk: mazeWalk, mazeSolve: mazeSolve,
    norm: norm, fillMatch: fillMatch, levelOf: levelOf };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TOLJourney = api;
})(this);
