/* coin-pusher-data.js — the words and friends for the Kindness Coin Pusher (/coin-pusher.html).
   window.TOLCoinData = { tips, chars, drawMedallion(canvas, char) }
   tips:  { id, tier (1 everyday · 2 deeper · 3 rare), t (title), b (one or two plain sentences),
            tool (a tools-registry id: the link's name and address come from window.TOLToolById when it is there),
            href (the page, used when there is no tool or to point at one part of it), label (the link's name without the registry) }
   chars: every character on the site, with where each one lives. Nothing here is stored or sent. */
(function () {
  'use strict';

  var tips = [
    // ---------- everyday tips (every 5 coins)
    { id: 'setup', tier: 1, t: 'Fix the setup, not the person', b: 'When the same thing keeps going wrong, look at the setup before the person: who owns it, when it happens, and how anyone would know it’s done.', href: '/five-pillars.html#p2-h', label: 'The Five Pillars: fix the setup, not the person' },
    { id: 'state', tier: 1, t: 'Check your state first', b: 'Before a hard talk, ask yourself: am I hungry, tired or already wound up? If so, it’s a later talk, not a never talk. The same goes for them.', tool: 'weather', label: 'My weather today' },
    { id: 'pauseline', tier: 1, t: 'A pause needs a return time', b: 'If it’s getting heated, say when you’ll come back: “I need to stop. I’ll come back at eight.” A pause with a time is a promise, not a door shutting.', tool: 'pause', href: '/pursue-withdraw.html#plan-h', label: 'Make a pause plan' },
    { id: 'outbreath', tier: 1, t: 'Breathe out longer than in', b: 'In for 4, out for 6, for a minute or two. It’s one of the simplest ways to help your body settle before you say anything.', href: '/nervous-system.html#now', label: 'Calm your nervous system now' },
    { id: 'owner', tier: 1, t: 'One owner per job', b: 'A job that belongs to everyone belongs to no one. Give each job one owner and one backup, and write it down where you can both see it.', tool: 'owner', label: 'One owner per job' },
    { id: 'askhelp', tier: 1, t: 'Ask for help plainly', b: 'Help is easier to give when the ask is clear: what, by when, and what done looks like. “Can you take the bins out by Tuesday night?” works better than “You never help.”', href: '/invisible-labor-mental-load.html#words', label: 'Words that help when you bring it up' },
    { id: 'kindno', tier: 1, t: 'A kind no', b: '“I can’t do Saturday, but I could do Sunday morning.” A no that comes with something you can offer is easier to hear, and easier to say.', tool: 'refusals', href: '/signal-translator.html#write-no', label: 'Say no kindly' },
    { id: 'thanks', tier: 1, t: 'Make your thank-you specific', b: '“Thanks for filling the car up, it made my morning easier” lands better than a general “thanks for everything”. Name the thing and what it did for you.', href: '/turning-toward.html#tt-title', label: 'Say one specific thank-you' },
    { id: 'bids', tier: 1, t: 'Notice the small reach', b: 'When someone shares a small thing, like “look at that bird”, turning toward it for a moment counts. Closeness is mostly built from these.', href: '/turning-toward.html', label: 'Turning toward' },
    { id: 'land', tier: 1, t: 'Read it as they might', b: 'Before you send a message that matters, read it as if you were tired and worried. If one word could sting, change that one word.', tool: 'signal', label: 'Chat analyzer' },
    { id: 'daily', tier: 1, t: 'Ninety seconds a day', b: 'One sentence each: how I’m doing, and what’s coming up. Small things stay small when they get said early.', tool: 'checkin90', label: '90-second daily check-in' },
    { id: 'weekly', tier: 1, t: 'A short weekly check-in', b: 'Once a week: what went well, what felt heavy, and one small change to try. Keep it short and kind, and end on something good.', tool: 'checkincard', label: 'Check-in card' },
    { id: 'invisible', tier: 1, t: 'Put the invisible work on the list', b: 'Noticing, remembering and planning are real work. When you list who does what, write those down too, not just the doing.', href: '/invisible-labor-mental-load.html#examples', label: 'What counts as invisible labor?' },
    { id: 'speeds', tier: 1, t: 'Agree a when, not just a what', b: 'If one of you decides fast and the other needs time, agree when you’ll decide: “Let’s settle it by Thursday lunch.” Both speeds get respected.', tool: 'pace12', label: 'Same moment, different speeds' },
    { id: 'tryagain', tier: 1, t: 'Repair early and small', b: '“That came out wrong. Can I try again?” A small repair in the moment saves a long one later, and either of you can start it.', href: '/apology-languages.html', label: 'Apology languages' },
    { id: 'ask', tier: 1, t: 'Ask for what you need', b: '“Could you cook on Tuesdays?” is easier to say yes to than “You never cook.” Turn the complaint into the request hiding inside it.', tool: 'flip', href: '/signal-translator.html#write-ask', label: 'Ask for a change' },
    { id: 'everything', tier: 1, t: 'Is it us, or is it everything else?', b: 'A hard week can feel like a hard relationship. Check the outside pressure first: work, sleep, money, health. Then decide what’s really between you.', tool: 'static14', label: 'Is it us, or is it everything else?' },
    { id: 'ritual', tier: 1, t: 'Keep one little ritual', b: 'A Sunday walk, a goodnight text, tea at the same time. Small things done on purpose keep you close when life is busy.', tool: 'rituals15', label: 'Keep your little rituals alive' },
    { id: 'upset', tier: 1, t: 'Upset right now?', b: 'Say a pause line, breathe out slowly for a minute, then move apart for twenty minutes and come back on time. You don’t have to solve anything yet.', tool: 'upset', label: 'Upset right now?' },
    { id: 'fair', tier: 1, t: 'Fair isn’t always 50/50', b: 'A fair split doesn’t have to mean equal jobs. It means both of you think it can last. Check it together, with real numbers.', tool: 'split', label: 'Check the split' },
    { id: 'once', tier: 1, t: 'Settle it once, in writing', b: 'A room rule, a holiday plan, who packs the bag. Agree it once, write it down, and the same talk stops coming back.', tool: 'plans', label: 'Make a plan together' },
    { id: 'battery', tier: 1, t: 'Tired isn’t a character flaw', b: 'Snapping when you’re worn out says more about your battery than your heart. Give the other person the same allowance you’d want.', href: '/five-pillars.html#p3-h', label: 'The Five Pillars: read your state first' },
    { id: 'move', tier: 1, t: 'Move for a few minutes', b: 'A short walk, the stairs, shaking out your arms. Moving is one of the best-studied ways to ease stress, and it needs nothing you don’t have.', href: '/nervous-system.html#now', label: 'Calm your nervous system now' },

    // ---------- deeper tips (every 25 coins, or 4 or more coins in one push)
    { id: 'pursue', tier: 2, t: 'Talk now, or need space? Both are real', b: 'If one of you wants to talk now and the other needs space, neither is wrong. On a calm day, agree how a pause works and when you’ll come back.', href: '/pursue-withdraw.html#both', label: 'One of you wants to talk now, the other needs space' },
    { id: 'kit', tier: 2, t: 'Make your calm plan on a calm day', b: 'Write down your early signs, two things that settle you, and your pause line, while you’re calm. In the moment, you only have to follow it.', tool: 'calmkit', label: 'Calm-down plan' },
    { id: 'comesback', tier: 2, t: 'The argument that keeps coming back', b: 'If the same fight returns every month, the setup is probably feeding it. Look back once a month and change one thing about how it’s set up.', tool: 'keepscoming', label: 'What keeps coming back?' },
    { id: 'log', tier: 2, t: 'Write down one ordinary week', b: 'Instead of arguing about who does more, log one real week. Real numbers end a lot of guessing, and they often surprise both people.', tool: 'whodid', label: 'Who did what this week' },
    { id: 'recheck', tier: 2, t: 'Re-check what used to work', b: 'Things that worked for years can quietly stop working. A small monthly re-check catches it early, before anyone feels taken for granted.', href: '/complacency.html', label: 'Complacency' },
    { id: 'oldrule', tier: 2, t: 'When a reaction feels too big', b: 'If a reaction feels bigger than the moment, it may be an old rule from long ago. Ask kindly: is this rule still helping me now?', tool: 'roots', label: 'Where a reaction comes from' },
    { id: 'card', tier: 2, t: 'Tell people how to reach you', b: 'People take words in differently. A short card on how you like hard things said saves both of you a lot of guessing.', tool: 'wavelength', label: 'Know how you connect' },
    { id: 'coreg', tier: 2, t: 'Calm is catching', b: 'One settled person can help another settle: sitting nearby, a slower voice, a glass of water. You don’t need the right words to help.', href: '/nervous-system.html#co-regulation', label: 'Calming together' },
    { id: 'lands', tier: 2, t: 'Before you reply to something that stung', b: 'Ask two questions: what do I want them to understand, and what do I want to happen next? Then say only what serves those.', tool: 'sayit', label: 'Say it so it lands' },
    { id: 'hours', tier: 2, t: 'Different hours, one handover', b: 'If you work different hours, keep a short written handover, so neither of you has to carry everything in your head.', href: '/different-hours.html', label: 'When you work different hours' },
    { id: 'team', tier: 2, t: 'At work, too: one owner and a backup', b: 'Jobs that land on whoever notices first wear the noticers out. Name an owner, a backup and how often it happens.', tool: 'team', label: 'Team tools' },
    { id: 'writing', tier: 2, t: 'Some talks go better in writing', b: 'If a topic goes wrong every time you say it out loud, take turns in writing. Both people get time to think before they answer.', tool: 'write', label: 'Talk it through in writing' },
    { id: 'whole', tier: 2, t: 'See the whole load together', b: 'Before deciding who should do more, put everything both of you do on one page. It’s hard to be fair about work you can’t see.', tool: 'lemon-quick', label: 'Who does what at home' },
    { id: 'restate', tier: 2, t: 'Say their side first', b: 'Put their point into your own words until they say “yes, that’s it”. Then make yours. People listen better once they feel heard.', tool: 'perspective', label: 'Rewind the talk: their side' },

    // ---------- rare tips (every 100 coins, or 7 or more coins in one push)
    { id: 'incentives', tier: 3, t: 'Notice the quiet incentives', b: 'Things drift toward whatever the setup quietly rewards. If whoever notices a job always ends up doing it, noticing gets punished. Change the setup, not the person.', href: '/five-pillars.html#p5-h', label: 'The Five Pillars: notice the quiet incentives' },
    { id: 'columns', tier: 3, t: 'Both columns on one page', b: 'Some work is done but never written down: the remembering, the smoothing-over. The fix isn’t a bill. It’s getting both people’s work onto one page, in the same units.', href: '/book/preface-in-depth.html#unbilled-debt', label: 'The book: unbilled debt' },
    { id: 'window', tier: 3, t: 'Know your window', b: 'Everyone has a range where they can think and listen. Outside it, the best talk is a later talk. Learn the signs that you’re leaving yours.', href: '/nervous-system.html#window', label: 'The window of tolerance' },
    { id: 'slack', tier: 3, t: 'Leave some room in the week', b: 'A home running at full stretch has no room for an ordinary bad day. Keep one evening a week with nothing planned.', href: '/polymath.html#roots', label: 'The polymath way: one root, many branches' },
    { id: 'early', tier: 3, t: 'Outside help works best early', b: 'Talking to a counsellor isn’t a last resort. Going while you still like each other is often easier than waiting until you don’t.', href: '/outside-help.html#counsellor', label: 'Find a counsellor' },
    { id: 'loops', tier: 3, t: 'Small and often beats big and rare', b: 'A few minutes every week does more than one big talk a year. Small habits, checked each time, shape the whole home.', href: '/polymath.html#roots', label: 'The polymath way: feedback loops' },
    { id: 'impact', tier: 3, t: 'What you meant, and how it landed', b: 'Both can be true at once. Try: “I didn’t mean it that way, and I can see it hurt.” Neither person has to be wrong for it to be fixed.', tool: 'signal', label: 'Chat analyzer' },
    { id: 'yourself', tier: 3, t: 'Start with yourself', b: 'The one person you can change today is you. One small change on your side often shifts the whole pattern between two people.', href: '/learn/index.html', label: 'Stories from Philosophy' },
    { id: 'ownwords', tier: 3, t: 'When it doesn’t fit a box', b: 'Describe your situation in your own words. Professor Puddles can point you to the parts of the site that fit it, privately.', tool: 'ask', label: 'Ask Professor Puddles' }
  ];

  // every character on the site, and where each one lives
  var chars = [
    { id: 'puddles', name: 'Professor Puddles', emo: '💧', ring: '#7FB2D6', home: '/ask.html', where: 'Ask Professor Puddles', line: 'A cheerful raindrop professor who knows the whole site, and loves a good question.' },
    { id: 'tidbit', name: 'Tidbit', emo: '🐶', ring: '#C98A4F', pup: 'collar', home: '/frequency-journey.html', where: 'Tidbit and Sugarfoot’s Arcade', line: 'The leaner pup with the black mask and the big smile. First to every treat.' },
    { id: 'sugarfoot', name: 'Sugarfoot', emo: '🐶', ring: '#A45C2E', pup: 'drop', home: '/frequency-journey.html', where: 'Tidbit and Sugarfoot’s Arcade', line: 'The stocky pup with floppy ears, white feet and a gentle wag for everyone.' },
    { id: 'ollie', name: 'Ollie the owl', emo: '🦉', ring: '#9C8466', home: '/frequency-buddies.html', where: 'Frequency Buddies', line: 'A wise owl from the cartoon, and a very good listener.' },
    { id: 'dot', name: 'Dot the snail', emo: '🐌', ring: '#C7A6D9', home: '/frequency-buddies.html', where: 'Frequency Buddies', line: 'Takes her time, and always gets there in the end.' },
    { id: 'hopper', name: 'Hopper the frog', emo: '🐸', ring: '#7DB07A', home: '/frequency-buddies.html', where: 'Frequency Buddies', line: 'One big hop, then a long, happy sit.' },
    { id: 'nutmeg', name: 'Nutmeg the squirrel', emo: '🐿️', ring: '#C77D4A', home: '/frequency-buddies.html', where: 'Frequency Buddies', line: 'Quick, chatty, and always has a snack tucked away.' },
    { id: 'lumi', name: 'Lumi the red panda', emo: '', draw: 'panda', ring: '#D9774A', home: '/frequency-buddies.html', where: 'Frequency Buddies', line: 'A soft, round-eared red panda with a stripy tail.' },
    { id: 'beep', name: 'Beep the robot', emo: '🤖', ring: '#8FA3B5', home: '/frequency-buddies.html', where: 'Frequency Buddies', line: 'A friendly robot with a very deep voice and a kind heart.' },
    { id: 'ducklings', name: 'The ducklings', emo: '🐥', ring: '#E8C35A', home: '/frequency-buddies.html', where: 'Frequency Buddies', line: 'They go everywhere in a line, peeping in tiny voices.' },
    { id: 'moon', name: 'The Moon', emo: '', draw: 'moon', ring: '#B7B3D9', home: '/frequency-buddies.html', where: 'Frequency Buddies', line: 'Watches over the pups at night, and speaks softly.' },
    { id: 'butterfly', name: 'The glowing butterflies', emo: '🦋', ring: '#8FC1D9', home: '/night-garden.html', where: 'The Night Garden', line: 'They drift through the Night Garden. The pups chase them, and the bunny follows.' },
    { id: 'bunny', name: 'The Night Garden bunny', emo: '🐰', ring: '#D9B8C4', home: '/night-garden.html', where: 'The Night Garden', line: 'Spins, leaps and flops an ear when you say hello.' },
    { id: 'hedgehog', name: 'The Night Garden hedgehog', emo: '🦔', ring: '#A88F72', home: '/night-garden.html', where: 'The Night Garden', line: 'Snug in its burrow under the flowers.' },
    { id: 'bear', name: 'Your Dojo bear', emo: '🐻', ring: '#A9744A', home: '/bears-dojo.html', where: 'The Bears Dojo', line: 'The bear you build waits by the gate of the temple garden.' },
    { id: 'kip', name: 'Kip the Paperclip', emo: '📎', ring: '#9DB0BF', home: '/whats-new.html', where: 'What’s new', line: 'Sits by the Share buttons. Tap him for a trick: a dance, a spin, a heart.' },
    { id: 'peach', name: 'Peach', emo: '', draw: 'peach', ring: '#F2A98A', home: '/brand.html', where: 'Our logo', line: 'The round one in the logo. Shares one heart with Lilac.' },
    { id: 'lilac', name: 'Lilac', emo: '', draw: 'lilac', ring: '#B9A2D9', home: '/brand.html', where: 'Our logo', line: 'The squishy square one in the logo, because nobody is wired quite the same.' },
    { id: 'grumble', name: 'Grumble', emo: '', draw: 'cloud', col: '#9FA8C9', ring: '#9FA8C9', home: '/frequency-journey.html', where: 'Treat Chase, in the Arcade', line: 'A little cloud of Static. A golden heart turns him into bubbles.' },
    { id: 'fuzz', name: 'Fuzz', emo: '', draw: 'cloud', col: '#C9A8E0', ring: '#C9A8E0', home: '/frequency-journey.html', where: 'Treat Chase, in the Arcade', line: 'A fuzzy little cloud of Static who likes to pop up by surprise.' },
    { id: 'mumble', name: 'Mumble', emo: '', draw: 'cloud', col: '#F2B6A0', ring: '#F2B6A0', home: '/frequency-journey.html', where: 'Treat Chase, in the Arcade', line: 'The shy cloud of Static. Mostly keeps to the corners.' },
    { id: 'drift', name: 'Drift', emo: '', draw: 'cloud', col: '#A8D8C8', ring: '#A8D8C8', home: '/frequency-journey.html', where: 'Treat Chase, in the Arcade', line: 'A wandering cloud of Static who goes wherever the breeze goes.' }
  ];

  // ---------- drawing a medallion: a brass ring, a cream face and the character (canvas 2D, any size)
  function face(g, x, y, s, ink) {
    g.fillStyle = ink || '#2B2620';
    g.beginPath(); g.arc(x - s * 0.32, y, s * 0.09, 0, 7); g.arc(x + s * 0.32, y, s * 0.09, 0, 7); g.fill();
    g.strokeStyle = ink || '#2B2620'; g.lineWidth = s * 0.06; g.lineCap = 'round';
    g.beginPath(); g.arc(x, y + s * 0.12, s * 0.2, 0.2 * Math.PI, 0.8 * Math.PI); g.stroke();
    g.fillStyle = 'rgba(240,120,130,.45)';
    g.beginPath(); g.ellipse(x - s * 0.55, y + s * 0.18, s * 0.14, s * 0.08, 0, 0, 7); g.ellipse(x + s * 0.55, y + s * 0.18, s * 0.14, s * 0.08, 0, 0, 7); g.fill();
  }
  function drawChar(g, c, S) {
    var cx = S / 2, cy = S / 2, u = S / 256;
    if (c.pup && window.TOLPups) {
      g.save(); g.translate(cx - 4 * u, cy + 62 * u); g.scale(2.7 * u, 2.7 * u);
      try { window.TOLPups.draw(g, window.TOLPups.looks[c.pup], 'sit', 0, 0.2, false, 0, 0); } catch (e) {}
      g.restore(); return;
    }
    if (c.id === 'puddles') {
      // a raindrop with round glasses and a little mortarboard
      g.fillStyle = '#8EC5EA'; g.beginPath(); g.moveTo(cx, cy - 78 * u);
      g.bezierCurveTo(cx + 22 * u, cy - 40 * u, cx + 62 * u, cy + 4 * u, cx + 58 * u, cy + 34 * u);
      g.bezierCurveTo(cx + 54 * u, cy + 76 * u, cx - 54 * u, cy + 76 * u, cx - 58 * u, cy + 34 * u);
      g.bezierCurveTo(cx - 62 * u, cy + 4 * u, cx - 22 * u, cy - 40 * u, cx, cy - 78 * u); g.fill();
      g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.ellipse(cx - 26 * u, cy - 6 * u, 9 * u, 18 * u, 0.5, 0, 7); g.fill();
      g.strokeStyle = '#3A3550'; g.lineWidth = 5 * u;
      g.beginPath(); g.arc(cx - 20 * u, cy + 26 * u, 15 * u, 0, 7); g.moveTo(cx + 35 * u, cy + 26 * u); g.arc(cx + 20 * u, cy + 26 * u, 15 * u, 0, 7); g.moveTo(cx - 5 * u, cy + 24 * u); g.lineTo(cx + 5 * u, cy + 24 * u); g.stroke();
      g.fillStyle = '#2B2620'; g.beginPath(); g.arc(cx - 20 * u, cy + 26 * u, 5 * u, 0, 7); g.arc(cx + 20 * u, cy + 26 * u, 5 * u, 0, 7); g.fill();
      g.lineWidth = 4 * u; g.beginPath(); g.arc(cx, cy + 46 * u, 10 * u, 0.2 * Math.PI, 0.8 * Math.PI); g.stroke();
      g.fillStyle = '#3A3550'; g.beginPath(); g.moveTo(cx - 40 * u, cy - 62 * u); g.lineTo(cx, cy - 78 * u); g.lineTo(cx + 40 * u, cy - 62 * u); g.lineTo(cx, cy - 48 * u); g.closePath(); g.fill();
      g.strokeStyle = '#E2B04A'; g.lineWidth = 3 * u; g.beginPath(); g.moveTo(cx + 2 * u, cy - 64 * u); g.lineTo(cx + 30 * u, cy - 52 * u); g.lineTo(cx + 30 * u, cy - 30 * u); g.stroke();
      return;
    }
    if (c.draw === 'cloud') {
      g.fillStyle = c.col;
      [[-38, 14, 34], [0, -6, 44], [38, 14, 34], [-18, 26, 30], [18, 26, 30]].forEach(function (b) { g.beginPath(); g.arc(cx + b[0] * u, cy + b[1] * u, b[2] * u, 0, 7); g.fill(); });
      face(g, cx, cy + 10 * u, 40 * u); return;
    }
    if (c.draw === 'peach') {
      g.fillStyle = '#F6B08F'; g.beginPath(); g.arc(cx, cy + 6 * u, 64 * u, 0, 7); g.fill();
      g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.ellipse(cx - 26 * u, cy - 24 * u, 14 * u, 9 * u, -0.5, 0, 7); g.fill();
      face(g, cx, cy + 6 * u, 48 * u); heart(g, cx + 46 * u, cy + 50 * u, 16 * u); return;
    }
    if (c.draw === 'lilac') {
      g.fillStyle = '#BFA6E0'; rr(g, cx - 62 * u, cy - 56 * u, 124 * u, 120 * u, 34 * u); g.fill();
      g.fillStyle = 'rgba(255,255,255,.3)'; g.beginPath(); g.ellipse(cx - 28 * u, cy - 30 * u, 14 * u, 8 * u, -0.4, 0, 7); g.fill();
      face(g, cx, cy + 6 * u, 48 * u); heart(g, cx - 46 * u, cy + 50 * u, 16 * u); return;
    }
    if (c.draw === 'moon') {
      g.fillStyle = '#F4E7B8'; g.beginPath(); g.arc(cx, cy, 64 * u, 0, 7); g.fill();
      g.fillStyle = 'rgba(200,180,120,.35)'; [[-30, -28, 10], [28, -34, 7], [34, 30, 9]].forEach(function (b) { g.beginPath(); g.arc(cx + b[0] * u, cy + b[1] * u, b[2] * u, 0, 7); g.fill(); });
      face(g, cx, cy + 4 * u, 44 * u, '#5A4A3A'); return;
    }
    if (c.draw === 'panda') {
      // a red panda: round russet head, white ear tips, white cheeks and brows
      g.fillStyle = '#C8602F'; tri(g, cx - 66 * u, cy - 26 * u, cx - 34 * u, cy - 74 * u, cx - 14 * u, cy - 40 * u); tri(g, cx + 66 * u, cy - 26 * u, cx + 34 * u, cy - 74 * u, cx + 14 * u, cy - 40 * u);
      g.fillStyle = '#FFF4E6'; tri(g, cx - 54 * u, cy - 34 * u, cx - 36 * u, cy - 62 * u, cx - 26 * u, cy - 42 * u); tri(g, cx + 54 * u, cy - 34 * u, cx + 36 * u, cy - 62 * u, cx + 26 * u, cy - 42 * u);
      g.fillStyle = '#D9774A'; g.beginPath(); g.ellipse(cx, cy + 6 * u, 70 * u, 58 * u, 0, 0, 7); g.fill();
      g.fillStyle = '#FFF4E6'; g.beginPath(); g.ellipse(cx - 34 * u, cy + 26 * u, 24 * u, 18 * u, 0, 0, 7); g.ellipse(cx + 34 * u, cy + 26 * u, 24 * u, 18 * u, 0, 0, 7); g.ellipse(cx, cy + 34 * u, 20 * u, 14 * u, 0, 0, 7); g.fill();
      g.beginPath(); g.ellipse(cx - 26 * u, cy - 18 * u, 10 * u, 6 * u, 0, 0, 7); g.ellipse(cx + 26 * u, cy - 18 * u, 10 * u, 6 * u, 0, 0, 7); g.fill();
      g.fillStyle = '#2B2620'; g.beginPath(); g.arc(cx - 24 * u, cy + 2 * u, 6 * u, 0, 7); g.arc(cx + 24 * u, cy + 2 * u, 6 * u, 0, 7); g.ellipse(cx, cy + 26 * u, 7 * u, 5 * u, 0, 0, 7); g.fill();
      return;
    }
    g.font = Math.round(118 * u) + 'px "Noto Color Emoji","Apple Color Emoji","Segoe UI Emoji",sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    if (c.id === 'ducklings') { g.font = Math.round(78 * u) + 'px "Noto Color Emoji","Apple Color Emoji","Segoe UI Emoji",sans-serif'; g.fillText(c.emo, cx - 34 * u, cy + 14 * u); g.fillText(c.emo, cx + 34 * u, cy + 14 * u); g.fillText(c.emo, cx, cy - 34 * u); return; }
    g.fillText(c.emo, cx, cy + 8 * u);
  }
  function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function tri(g, a, b, c, d, e, f) { g.beginPath(); g.moveTo(a, b); g.lineTo(c, d); g.lineTo(e, f); g.closePath(); g.fill(); }
  function heart(g, x, y, s) {
    g.fillStyle = '#E2556A'; g.beginPath(); g.moveTo(x, y + s * 0.9);
    g.bezierCurveTo(x - s * 1.4, y, x - s * 0.7, y - s * 1.1, x, y - s * 0.35);
    g.bezierCurveTo(x + s * 0.7, y - s * 1.1, x + s * 1.4, y, x, y + s * 0.9); g.fill();
  }
  function drawMedallion(cv, c, found) {
    var S = cv.width, g = cv.getContext('2d'), cx = S / 2, R = S / 2;
    g.clearRect(0, 0, S, S);
    var rg = g.createLinearGradient(0, 0, S, S);
    rg.addColorStop(0, '#F3D891'); rg.addColorStop(0.45, '#C99A3E'); rg.addColorStop(0.7, '#E9C46F'); rg.addColorStop(1, '#9C7330');
    g.fillStyle = rg; g.beginPath(); g.arc(cx, cx, R - 1, 0, 7); g.fill();
    g.fillStyle = found === false ? '#5A5346' : (c.ring || '#C99A3E'); g.beginPath(); g.arc(cx, cx, R * 0.84, 0, 7); g.fill();
    var fg = g.createRadialGradient(cx - R * 0.2, cx - R * 0.25, R * 0.1, cx, cx, R * 0.78);
    fg.addColorStop(0, found === false ? '#7A7266' : '#FFFBF1'); fg.addColorStop(1, found === false ? '#5E574C' : '#F3E6C8');
    g.fillStyle = fg; g.beginPath(); g.arc(cx, cx, R * 0.76, 0, 7); g.fill();
    g.save(); g.beginPath(); g.arc(cx, cx, R * 0.76, 0, 7); g.clip();
    if (found === false) {
      g.fillStyle = '#EDE3CC'; g.font = '600 ' + Math.round(S * 0.42) + 'px Fraunces, Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('?', cx, cx + S * 0.03);
    } else drawChar(g, c, S);
    g.restore();
    // a soft shine across the brass
    g.strokeStyle = 'rgba(255,255,255,.45)'; g.lineWidth = S * 0.02; g.beginPath(); g.arc(cx, cx, R * 0.92, 3.6, 4.6); g.stroke();
  }

  window.TOLCoinData = { tips: tips, chars: chars, drawMedallion: drawMedallion };
})();
