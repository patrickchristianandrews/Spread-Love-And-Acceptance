/* pup-visits-lines.js — what Tidbit and Sugarfoot say when they pop by (pup-visits.js).
   Loaded only when a visit is about to happen. A line is plain text, or [text, link, link label].
   Tidbit has the big smile: quick, curious, first for high fives, lots of "Ooh!".
   Sugarfoot is steady and brave, slower and softer, and the best hugger.
   Both have a big heart of gold.
   Style: plain, warm, cute American English. Short enough to read in a few seconds.
   No health claims, nothing about crisis or abuse, and every link points to a real page. */
window.TOL_PUP_LINES = {
  // random hellos (no section needed)
  hi: {
    tidbit: [
      'Hi hi hi! Just popping by to say hi!',
      'Ooh, hello! I was zooming past and saw you.',
      'Boop! Hi! Okay, that’s all. Bye! (Just kidding. Hi!)',
      'Hey! Guess who missed you? Me! Tidbit!',
      'Hi friend! My tail says hello too.',
      'Oh hey! I love that you’re here.',
      'Quick hello! High five? Up top!',
      'Knock knock! It’s me, with a big smile.',
      'Hi! I brought you a smile. It’s a big one.',
      'Hello, hello! Just checking in on my favorite reader.',
      'Hiya! Sugarfoot says hi too. She’s a little slower, but she’s coming.',
      'Psst! Hi! That’s the whole message. Hi!'
    ],
    sugarfoot: [
      'Hey there. Just came by to sit with you a minute.',
      'Hi, friend. No rush. I’m just saying hello.',
      'Hello. I walked over slowly so I wouldn’t startle you.',
      'Hi. I’m right here with you, reading along.',
      'Hey you. Sending a soft, steady hello.',
      'Hello, friend. Tidbit ran ahead. I’m the calm one.',
      'Hi. Just wanted you to know someone’s glad you’re here.',
      'Hey. Come here, you look like you could use a hug.',
      'Hello. Take a slow breath with me? Okay. That was nice.',
      'Hi there. One page at a time. I’ll keep you company.',
      'Hello. I saved you a warm spot on the couch.',
      'Hey, friend. Just a quiet hello and a gentle wag.'
    ]
  },

  // just love
  love: {
    tidbit: [
      'You’re doing great! Like, really great!',
      'High five for reading this! Up top!',
      'You made my tail go wiggle wiggle wiggle!',
      'Ooh, you’re learning stuff! I’m so proud!',
      'Big smile, just for you!',
      'You’re my favorite. Don’t tell the squirrels.',
      'I think you’re super. Tidbit says so, so it’s official.',
      'Every page you read is a little gift to your people!',
      'You + trying = amazing. That’s just math.',
      'Heart of gold alert! Oh wait, that’s yours!',
      'Zoomies of joy because you’re here!',
      'You’re so good at this. Sniff sniff… yep, smells like progress!',
      'Paws up for you! Both of them! Okay, one. I need the other one to stand.',
      'Curious people are the best people. That’s you!',
      'Whoever you’re reading this for is lucky to have you.',
      'You’re allowed to be proud of small steps. I am!',
      'Tiny wins are still wins! Celebrate with me!',
      'Ooh, a reader! My favorite kind of person!',
      'You bring the kindness, I’ll bring the wiggles.',
      'You’re doing a kind thing right now, just by being here.',
      'I believe in you! I also believe in snacks. But mostly you!',
      'Sending you the biggest, waggiest hello!'
    ],
    sugarfoot: [
      'Sending you a big hug.',
      'You’re doing great. Really.',
      'You don’t have to get it perfect. You just keep showing up.',
      'I’m proud of you for taking the time.',
      'Slow is fine. Steady is lovely.',
      'You have a heart of gold. I can tell.',
      'Here’s a hug, the long kind. Take it with you.',
      'Whatever today is like, you’re doing your best. That counts.',
      'Be gentle with yourself today. You deserve it.',
      'Brave isn’t loud. Sometimes it’s just reading one more page.',
      'Your people are lucky you care this much.',
      'You’re allowed to rest. The page will wait.',
      'Kind to others, kind to you. Both matter.',
      'I’m right here. Keep going at your own pace.',
      'A slow wag, just for you.',
      'Little steps still get you there.',
      'You’re not behind. You’re right where you are, and that’s okay.',
      'Leaning on each other is how the best teams work.',
      'Lots of love from me, and a gentle nose boop.',
      'You make things warmer just by trying.',
      'Deep breath out. There. You’re doing fine.',
      'Proud of you. Quietly, steadily, all the way.'
    ]
  },

  // the lead-in when a pup shares one of the site's "Little tip for today" cards; {tip} is the tip
  lead: {
    tidbit: ['Ooh, quick tip! {tip}', 'Psst! Try this: {tip}', 'I learned a thing! {tip}', 'Tip time! {tip}', 'Ooh ooh, here’s one: {tip}'],
    sugarfoot: ['Here’s a gentle one. {tip}', 'Something small to try: {tip}', 'A little tip, from me to you. {tip}', 'When you’re ready: {tip}', 'This one helps me stay steady. {tip}']
  },

  // "this part is about…" with the section's own heading; {h} is the heading
  about: {
    tidbit: [
      'Psst… this part is “{h}.” Ooh, it’s a good one!',
      'Ooh! “{h}” is one of my favorite bits!',
      'Sniff sniff… I smell a good idea in “{h}.”',
      'Hey! “{h}” coming up. Read it slow, then zoom!'
    ],
    sugarfoot: [
      'This part, “{h},” is worth a slow read.',
      '“{h}.” Take your time with this one. I’ll wait.',
      'I like this part: “{h}.” Try one small piece of it.',
      '“{h}.” No need to do it all. Just pick one thing.'
    ]
  },

  // general tips, for any page (either pup can say these)
  tips: [
    'Try one idea from this page this week. Just one!',
    'Pick the smallest next step and do only that.',
    'Say one specific thank-you today. “Thanks for taking out the trash” beats “thanks for everything.”',
    'Before giving advice, ask: “Do you want help, or do you just want me to listen?”',
    'Ask one curious question before you share your side.',
    'Talk about the setup, not the person. “Our plan isn’t working” is easier to hear.',
    'Write it down so nobody has to carry it all in their head.',
    'A five-minute check-in counts. Short and often beats long and rare.',
    'If a talk gets hot, name a time to come back to it. A pause with a time isn’t walking away.',
    'Assume a good reason first. They might just be having a long day.',
    'Notice one thing someone does for you today and say it out loud.',
    'Say what you need, not what they did wrong.',
    'Put a little pause before “yes.” “Let me check and get back to you” is okay.',
    'It’s fine to read a little now and come back later. The page will be here.',
    'Share one thing you read today with someone you care about.',
    ['New here? There’s a gentle first step.', '/start-here.html', 'Start here'],
    ['Want the whole idea on one page?', '/infographic.html', 'The one-page summary'],
    ['Five simple ideas hold this whole site up.', '/five-pillars.html', 'The Five Pillars'],
    ['How full is your battery today? Take a one-minute look.', '/quick-checks.html', 'Today’s Weather'],
    ['Little “Check yourself” moments light up your quest map!', '/quest.html', 'Your quest map'],
    ['Want something good to read next?', '/reading.html', 'Something to read'],
    ['Need a calm little break? We love the Night Garden.', '/night-garden.html', 'The Night Garden'],
    ['We have our own arcade! Pick one of us and play a maze chase or cross the road.', '/frequency-journey.html', 'The Frequency Journey'],
    ['Soft sounds for a slow evening.', '/soundscapes.html', 'Soundscapes'],
    ['A 90-second daily check-in, for busy days.', '/workpapers/wp-13-daily-check-in.html', 'The 90-second daily check-in'],
    ['Curious how it all fits together?', '/how-it-works.html', 'How it works']
  ],

  // tips for each part of the site (body[data-sec])
  sec: {
    start: [
      'Start wherever feels easy. There’s no wrong door.',
      'You don’t need to read it all today. One page is a great start.',
      ['A short tour, if you like tours.', '/how-it-works.html', 'How it works'],
      ['Not sure it’s for you? This page helps you decide.', '/is-this-for-you.html', 'Is this right for you?'],
      ['See every page in one list.', '/contents.html', 'Contents'],
      ['Each part of the program, and how it fits your people.', '/relationships.html', 'How it fits your relationships'],
      ['Ooh, what’s newest? Take a peek.', '/whats-new.html', 'What’s new']
    ],
    self: [
      'Your wiring is information, not a flaw.',
      'Notice how you feel without judging it. Just notice.',
      'Low-battery days are allowed. Plan a gentle one.',
      'Knowing what drains you helps you plan kinder days.',
      ['Make a little card about how you’re built, to share with your people.', '/wiring-card.html', 'Wiring Card'],
      ['How much are you carrying? Check before a hard talk.', '/workpapers/wp-02-how-much-are-you-carrying.html', 'Battery check'],
      ['Build your own calm-down kit for rough moments.', '/wp-11.html', 'The Calm-Down Kit'],
      ['Every brain is wired a bit differently. That’s okay!', '/wired-differently.html', 'Wired Differently']
    ],
    relationships: [
      'You’re on the same side of the table.',
      'Notice when someone reaches for you, and reach back. Even a small “Oh, nice!” counts.',
      'A good question beats a good guess.',
      'Quality time can be five minutes. Really.',
      ['Small reaches for attention matter so much.', '/turning-toward.html#bids', 'Noticing bids'],
      ['Short, friendly check-ins keep you in tune.', '/check-ins.html', 'Check-ins'],
      ['Say what you like about them, out loud.', '/turning-toward.html#fondness', 'Fondness and admiration'],
      ['Partners, family, friends, roommates, coworkers: there’s a spot for each.', '/relationships.html', 'How it fits your relationships']
    ],
    book: [
      'One chapter is plenty for today.',
      'Read slowly. The good bits stick better that way.',
      'Try one idea from this chapter before the next one.',
      ['Every chapter has a workpaper that puts it to use.', '/suite-index.html', 'The Suite Index'],
      ['The book starts with the work nobody sees.', '/book/preface.html', 'The Preface'],
      ['There’s more than one kind of fair!', '/book/chapter-4.html', 'Chapter IV'],
      ['Once a month, a kind look back.', '/book/chapter-5.html', 'Chapter V'],
      ['Want more to read after this?', '/library.html', 'The Professor’s Library']
    ],
    workpapers: [
      'Fill it in about yourself, not about the other person.',
      'Rough numbers are fine. Honest beats perfect.',
      'A worksheet starts a talk. It isn’t a scorecard.',
      'Blank spots are okay. Come back to them later.',
      ['Start by listing the quiet jobs nobody sees.', '/workpapers/wp-01.html', 'Who did what (WP-01)'],
      ['Every job gets one owner. Try it with just one chore!', '/workpapers/wp-03-one-owner-per-job.html', 'One owner per job (WP-03)'],
      ['Fill them in on your phone, or print them.', '/workpapers/fill/suite.html', 'The Workpaper Suite'],
      ['Can the way you share the load last? The calculator can help.', '/workpapers/calculators/is-the-setup-working-quick.html', 'Is the setup working for everyone? (CALC-01)']
    ],
    program: [
      'One week, one small change. That’s the whole trick.',
      'Skipped a day? Just pick it back up. No catching up needed.',
      'Do the week together if you can. Two heads, one plan.',
      ['The whole six weeks, step by step.', '/prog-01.html', 'The guided program'],
      ['Week 2 is all about giving every job one owner.', '/workpapers/wp-03-one-owner-per-job.html', 'One owner per job (WP-03)'],
      ['A 90-second daily check-in fits the busiest days.', '/workpapers/wp-13-daily-check-in.html', 'The 90-second daily check-in'],
      ['Start by noticing the work that’s already happening.', '/workpapers/wp-01.html', 'Who did what (WP-01)']
    ],
    tools: [
      'A tool is a helper, not a judge. Use what’s useful.',
      'Try it on something small first.',
      'What you type in the tools stays on your device.',
      ['Stuck on a tricky message? Read it a few different ways.', '/signal-translator.html', 'Signal Translator'],
      ['See a talk from more than one angle.', '/conversation-reader.html', 'Conversation Reader'],
      ['Ask the Professor. Answers come from this site’s own pages.', '/ask.html', 'Chat with Professor Puddles'],
      ['Play a little shop and learn about sharing the load.', '/lemonade-stand.html', 'Lemonade Stand']
    ],
    media: [
      'Soft sounds and a slow read make a cozy evening.',
      'Listening counts as learning too.',
      ['A few calm soundscapes to settle into.', '/soundscapes.html', 'Soundscapes'],
      ['Hand-picked articles, matched to what you’re reading.', '/reading.html', 'Something to read'],
      ['Stories that stay with you.', '/echoes-of-gold.html', 'Echoes of Gold'],
      ['Browse the deep-reading shelf.', '/library.html', 'The Professor’s Library']
    ],
    about: [
      'Everything here is plain language, on purpose.',
      'What you type in the tools stays on your device.',
      ['What’s built, what’s next, and what’s still a sketch.', '/roadmap.html', 'The roadmap'],
      ['The whole program in one overview.', '/program-overview.html', 'Program overview'],
      ['See every workpaper in order.', '/suite-index.html', 'The Suite Index'],
      ['Right now it’s all free, with no sign-up.', '/ways-in.html', 'Ways in']
    ],
    new: [
      'Ooh, new things! Pick one that looks fun.',
      ['Find the “Check yourself” moments and light up your map!', '/quest.html', 'Your quest map'],
      ['Our arcade is here! Pick one of us and play.', '/frequency-journey.html', 'The Frequency Journey'],
      ['The Professor has a whole library now.', '/library.html', 'The Professor’s Library'],
      ['Soft sounds for slow moments.', '/soundscapes.html', 'Soundscapes']
    ]
  },

  // key points, matched to words in the section's heading and first lines
  keys: [
    ['\\bown(s|er|ers|ership)?\\b|\\bjobs?\\b|chores?|who does|raci|treaty', [
      'Psst… this part is about owning one job each. Try it with just one chore!',
      ['One job, one owner. Everyone knows who to look to.', '/workpapers/wp-03-one-owner-per-job.html', 'One owner per job (WP-03)']
    ]],
    ['batter(y|ies)|stress|tank|drain|energy', [
      'This bit is about how full your battery is. Check yours before a hard talk!',
      ['Low battery? Pick a gentler day for big talks.', '/workpapers/wp-02-how-much-are-you-carrying.html', 'The battery check']
    ]],
    ['thank|gratitude|appreciat', [
      'This part is about thank-yous. Make one specific, like “thanks for the warm towel!”',
      'Say the small thanks out loud. Small ones count the most.'
    ]],
    ['\\bbids?\\b|reach(es|ing)? for|turn(ing)? toward|notice when', [
      ['This part is about small reaches for attention. Try noticing just one today!', '/turning-toward.html#bids', 'Noticing bids'],
      'A little “Oh, tell me more!” goes a long way.'
    ]],
    ['\\bfair|balance|split|share the load|sharing the load|load\\b', [
      ['Psst… there’s more than one kind of fair. Talk about which one you mean!', '/book/chapter-4.html', 'Two kinds of fair'],
      'Fair doesn’t always mean fifty-fifty. It means it works for both of you.'
    ]],
    ['unseen|invisible|nobody sees|quiet (work|jobs)|hidden', [
      ['This part is about the work nobody sees. Try listing three quiet jobs!', '/workpapers/wp-01.html', 'Who did what (WP-01)'],
      'Invisible work gets lighter when someone sees it.'
    ]],
    ['wiring|wired|how you.re built|rhythm', [
      ['This part is about how you’re built. Your wiring is information, not a flaw!', '/know-yourself.html', 'Know your own wiring'],
      ['Share how you’re built before a hard talk. It helps a lot!', '/wiring-card.html', 'Wiring Card']
    ]],
    ['check-?ins?|small and (often|frequent)|daily|weekly|catch-up', [
      'Small and often beats big and rare. Five minutes is plenty!',
      ['A 90-second daily check-in for busy days.', '/workpapers/wp-13-daily-check-in.html', 'The 90-second daily check-in']
    ]],
    ['say no|refus|not now|neutral refusal', [
      'This part is about saying no kindly. A clear “not now” is kind too.',
      'You can say no and still be warm. Both can be true!'
    ]],
    ['retun|repair|rough moment|after a fight|make up', [
      'This bit is about repair. Coming back after a rough moment is brave.',
      ['A calm-down kit helps before you come back to it.', '/wp-11.html', 'The Calm-Down Kit']
    ]],
    ['look-?back|monthly|month|audit|sign-?off|log\\b|tally', [
      ['Once a month, look back kindly. What went well?', '/book/chapter-5.html', 'The monthly look-back'],
      'Start the look-back with what went right. Then the tricky bits feel lighter.'
    ]],
    ['calm|feeling|breath|settle|pause', [
      ['Build a little calm-down kit for the rough moments.', '/wp-11.html', 'The Calm-Down Kit'],
      'Name the feeling. Just saying “I’m frustrated” can help it feel smaller.'
    ]],
    ['week \\d|7-day|seven days|first steps?|start with', [
      'Start with just one small step. You can add more next week!',
      'Tiny steps count! Tiny steps are how big changes start.'
    ]],
    ['pillar', [
      ['Five simple ideas hold everything up here.', '/five-pillars.html', 'The Five Pillars'],
      'Pick one pillar and look for it in your day.'
    ]],
    ['partner|family|friend|roommate|co-?worker|co-?parent|caregiv|team', [
      ['Every kind of relationship has a spot here.', '/relationships.html', 'How it fits your relationships'],
      'Every relationship is its own little team. Yours too!'
    ]],
    ['weather|forecast', [
      ['What’s your weather today? A one-minute look.', '/quick-checks.html', 'Today’s Weather'],
      'Some days are sunny, some are drizzly. Plan for the day you actually have.'
    ]],
    ['frequenc|tune|tuning|static|signal|station|in step', [
      ['Two kind people can still be a little out of tune. It’s fixable!', '/frequency-framework.html', 'The Frequency Framework'],
      ['Tricky message? Read it a few ways first.', '/signal-translator.html', 'Signal Translator']
    ]],
    ['moment|setting|timing|when to', [
      'Pick a good moment first. Not when someone’s hungry or rushing!',
      'The right time can matter as much as the right words.'
    ]],
    ['fond|admir|what you like about', [
      ['Remember what you like about them, and tell them!', '/turning-toward.html#fondness', 'Fondness and admiration'],
      'Say one nice thing you’ve noticed. Out loud is the magic part.'
    ]],
    ['talk|conversation|words|listen|tone', [
      'Try asking one curious question before you answer.',
      ['Same words can land differently. Try a softer tone.', '/workpapers/wp-09-say-it-so-it-lands.html', 'Say it so it lands (WP-09)']
    ]]
  ],

  // together visits: [what Tidbit says, what Sugarfoot says back]
  duets: [
    ['Hi! We came to say hi!', 'And to send you a big hug. Hi, friend.'],
    ['High five for reading! Up top!', 'And a slow, steady hug for good measure.'],
    ['I ran here super fast!', 'I walked. We got here together anyway. That’s teamwork.'],
    ['Ooh, you’re learning so much!', 'One page at a time. You’re doing great.'],
    ['We think you have a heart of gold!', 'We can tell. It shows.'],
    ['Quick! Tell someone you love them!', 'Or tell them tomorrow. Both are lovely.'],
    ['I’m fast and she’s steady!', 'And together we make a pretty good team. Just like you and your people.'],
    ['Is it snack time? It feels like snack time.', 'It’s always a good time for a little break.'],
    ['Guess what? You’re awesome!', 'He’s right. He’s usually right about the important things.'],
    ['We’re cheering for you! Woo!', 'Quietly and loudly. We cover both.'],
    ['Did you know small steps count?', 'They really do. Every one of them.'],
    ['Wiggle break! Everybody wiggle!', 'Or just a slow stretch. Also great.'],
    ['I brought a smile!', 'And I brought a hug. You get both.'],
    ['Hi! Okay, bye! Just kidding, hi!', 'He gets excited. We’re both really glad you’re here.']
  ]
};
