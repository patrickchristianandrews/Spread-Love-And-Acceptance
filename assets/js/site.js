/* site.js — shared navigation and membership for every page.
   To add a page: add one line to SECTIONS below (and to MENU, if it should show in the menu) and put these two lines in the page's <head>:
     <link rel="stylesheet" href="/assets/css/site.css">
     <script src="/assets/js/site.js" defer></script>
   To make a page members-only: set  paid: true  on its line. That's the only switch.
   SIMPLE FIRST: every page's address is its simple version. If a page also has a full
   version saved beside it as <name>-in-depth.html, set  deep: true  on its line. The menu
   then shows a "Dig deeper" link to it, and the in-depth page shares the simple page's
   menu entry, members lock and previous/next links.

   FREE PREVIEW: while the program is being built, freePreview (below) is true.
   Every "paid: true" page then opens for anyone who signs up with an email
   address. The address goes to Buttondown (the newsletter list) and the page
   unlocks in that browser right away. To start charging later, set
   freePreview to false: the Gumroad members-list check comes back unchanged. */

(function () {
  'use strict';

  // ===== Settings you edit =====
  var CONFIG = {
    // true = everything is free with an email sign-up (unless openAll); paid membership is "coming soon"
    freePreview: true,
    // true = everything is open to everyone while the program is being built: no sign-up, no locked
    // sections; the email list stays as an optional way to get updates. Set to false to bring the
    // sign-up gate (and later paid membership) back.
    openAll: true,
    signupUrl: 'https://buttondown.email/api/emails/embed-subscribe/spreadloveandacceptance',
    price: '$27/month',
    joinUrl: 'https://gumroad.com/spreadloveandacceptance', // ← replace with your Gumroad product link
    supportEmail: 'patrick.christian.andrews@gmail.com',
    // Web3Forms access key: sends the 404 page's broken-link reports to your inbox without
    // putting your email address on the site. Get one free at https://web3forms.com
    // (it's safe to be public). Until it's filled in, the report form stays hidden.
    formKey: 'PASTE-WEB3FORMS-ACCESS-KEY-HERE',
    membersFile: '/data/members.json'
  };

  // ===== Every page on the site, in reading order =====
  var SECTIONS = [
    { id: 'new', title: 'What’s new', blurb: 'Newly added and newly expanded, newest first.', items: [
      { href: '/whats-new.html', code: 'All', title: 'What’s new', note: 'Everything newly added and everything that’s grown, in one place, with dates' },
      { href: '/safety.html', code: 'New', title: 'Not safe at home?', note: 'Free hotlines, a quick way to leave this site, and how to clear what it keeps' },
      { href: '/pursue-withdraw.html', code: 'New', title: 'One wants to talk now, one needs space', note: 'The same fight, from both sides, with a pause plan you can fill in and share' },
      { href: '/retired-together.html', code: 'New', title: 'Retired and both home now', note: 'Sharing the house all day: routines, whole jobs, handing over kindly, and finding purpose' },
      { href: '/family-obligations.html', code: 'New', title: 'Supporting family and money home', note: 'When supporting parents is a duty: agree an amount together, and save alongside it' },
      { href: '/long-distance.html', code: 'New', title: 'Long-distance and apart', note: 'Time zones, check-ins on video, a call rhythm you agree, and reading short texts' },
      { href: '/work.html', code: 'New', title: 'At work', note: 'The plain version for teams: one owner per job, messages that land, appreciation, and a 45-minute team session' },
      { href: '/grief.html', code: 'New', title: 'Grief and later life', note: 'Loss, family after a loss, reconnecting, and starting a new chapter, with places to get help' },
      { href: '/caregivers.html', code: 'New', title: 'Caring for someone you love', note: 'When they can’t share the load back, who else can help, and where to find respite' },
      { href: '/en-espanol.html', code: 'New', title: 'En español', note: 'Pasos cortos para cuando los hijos pelean, cuando estás muy enojado, y si no estás a salvo en casa' },
      { href: '/groups.html', code: 'New', title: 'Leading a group', note: 'A free six-session guide with discussion questions and one-page handouts' },
      { href: '/parents.html', code: 'New', title: 'For parents', note: 'Big feelings, siblings who fight, calm-down routines, teens, and watching the pups together' },
      { href: '/teens.html', code: 'New', title: 'For teens', note: 'Parents, friends, feelings and dating, written for you, with places to get help' },
      { href: '/soundscapes.html#brain-breakers', code: 'New', title: 'Brain Breakers', note: 'The Soundscapes page is now all Brain Breakers: four instrumental pieces, with a music visualizer and vibration' },
      { href: '/love-languages.html', deep: true, code: 'New', title: 'Love languages: a menu, not a label', note: 'What is healthy and unhealthy about each of the five, how to practice and talk about them, and similar ideas like apology languages and bids' },
      { href: '/languages-of-connection.html', code: 'New', title: 'How the languages fit together', note: 'Love, apology and appreciation languages, touchstones and your wiring in one picture, with what to reach for when' },
      { href: '/install.html', code: 'New', title: 'Get the app', note: 'Install on Android in a few taps; iPhone steps today, App Store coming soon' },
      { href: '/upset-right-now.html', code: 'New', title: 'Upset right now?', note: 'A five-minute page for two upset people: a pause line with a return time, a breathing pacer, and how to come back' },
      { href: '/share-the-load.html', code: 'New', title: 'Share the load, step by step', note: 'The tools for splitting the load, in the order to use them, with a section for roommates' },
      { href: '/new-parent.html', code: 'New', title: 'New baby, sharing the load', note: 'Three steps for the baby jobs and the invisible ones' },
      { href: '/co-parenting.html', code: 'New', title: 'Separated co-parents', note: 'Calmer handoffs, a tone check, and a parallel-parenting route, with a safety note' },
      { href: '/surprise.html', code: 'New', title: 'Surprise me', note: 'One button picks a game, a guide or something calm' },
      { href: '/complacency.html', deep: true, code: 'New', title: 'Complacency', note: 'Why “it’s fine” stops being checked, how it shows up in you, partners, family, friends, housemates and coworkers, and the small re-checks that keep things alive' },
      { href: '/bears-dojo.html', code: 'New', title: 'The Bears Dojo', note: 'A temple garden to wander, a bear to build, and a quiet room of gentle things to do' },
      { href: '/wavelength.html', code: 'New', title: 'Wavelength', note: 'Replaces Your Heartprint: pick your wiring, find your Wave Code, read your self-discovery chapters' },
      { href: '/growing-up.html', code: 'New', title: 'Where your lens came from', note: 'How growing up shapes the way you see yourself and others, and how to choose which old rules to keep' },
      { href: '/frequency-buddies.html', code: 'New', title: 'Frequency Buddies', note: 'Animated episodes with Tidbit and Sugarfoot, with captions on' },
      { href: '/start-in-10-minutes.html', code: 'New', title: 'Start in 10 minutes', note: 'One short path: today’s weather, the Preface, one practice card and one thing logged' },
      { href: '/sent-this.html', code: 'New', title: 'Sent this by someone?', note: 'What the other person sees, what stays yours, and how to say yes, not yet or no kindly' },
      { href: '/quest.html', code: 'New', title: 'Your quest map', note: 'Little “Check yourself” moments on reading pages, and a map that lights up as you learn' },
      { href: '/calm-visualizer.html', code: 'New', title: 'Drift: calm visualizer', note: 'Deep, slow 3D colors and binaural tones matched to how you feel' },
      { href: '/five-pillars.html', code: 'New', title: 'The Five Pillars', note: 'How every part of the program fits together, inside you and between you and others' },
      { href: '/library.html', code: 'New', title: 'The Professor’s Library', note: 'Deep, plain-language reading on psychology and conflict, and Professor Puddles can chat about all of it' },
      { href: '/reading.html', code: 'New', title: 'Something to read', note: 'Hand-picked articles from trusted sources, matched to what you’re reading' },
      { href: '/frequency-journey.html', code: 'New', title: 'Tidbit and Sugarfoot’s Arcade', note: 'Five gentle classic games (maze chase, crossing, wagon-trail journey, brick breaker, catch), new every level, no game over' },
      { href: '/soundscapes.html', code: 'New', title: 'Brain Breakers', note: 'Shooting Star, Thunderous Shimmer, Watching a Shooting Star and Bouncy Bedroom, with a music visualizer and vibration' },
      { href: '/ask.html', code: 'New', title: 'Chat with Professor Puddles', note: 'Small drop, big brain: answers made only from this site’s pages. What you type stays on your device' },
      { href: '/pause-and-play.html', code: 'New', title: 'Levels that grow the background', note: 'Every few levels, something new appears behind every page and joins in' },
      { href: '/book/preface.html', code: 'Deeper', title: 'Mini dives, shore to deep', note: 'Tap any word with the water drop and wade in one step at a time' },
      { href: '/workpapers/fill/suite.html', code: 'New', title: 'The Workpaper Suite', note: 'Fillable, printable PDFs for your situation, with a plan for each week' }
    ]},
    { id: 'start', title: 'Start here', blurb: 'New to the site? These pages explain the idea and let you try it in a few minutes.', items: [
      { href: '/start-here.html', code: 'Start', title: 'Start here', note: 'What this is in one minute, and the one best first step for you' },
      { href: '/start-in-10-minutes.html', code: '10 min', title: 'Start in 10 minutes', note: 'A short, straight path: check your weather, read the Preface, try one card and log one thing' },
      { href: '/sent-this.html', code: '', title: 'Sent this by someone?', note: 'What they see, what stays yours, doing your side privately, and saying no kindly' },
      { href: '/share-the-load.html', code: '', title: 'Share the load, step by step', note: 'Which tool to use first for splitting the work at home, and what comes next. Roommates included' },
      { href: '/new-parent.html', code: '', title: 'New baby, sharing the load', note: 'A three-step way for new parents to split the baby jobs and the invisible ones' },
      { href: '/co-parenting.html', code: '', title: 'Separated co-parents', note: 'Exchange-day scripts, a tone check, parallel parenting, and a safety note' },
      { href: '/upset-right-now.html', code: '', title: 'Upset right now?', note: 'Pause, breathe and come back: a five-minute page, no sign-up' },
      { href: '/safety.html', code: '', title: 'Not safe at home?', note: 'Hotlines, leaving this site quickly, and clearing what it keeps' },
      { href: '/surprise.html', code: '', title: 'Surprise me', note: 'One button picks a game, a guide or something calm' },
      { href: '/install.html', code: '', title: 'Get the app', note: 'Android now, iPhone App Store coming soon: its own icon, full screen, works offline' },
      { href: '/program.html', code: '', title: 'Which part of the program to use', note: 'Six weeks, the Workpaper Suite, the package and report, and the indexes: which to use when' },
      { href: '/index.html', code: '', title: 'Home', note: 'What’s new, the ways in, and the full contents' },
      { href: '/five-pillars.html', deep: true, code: '', title: 'The Five Pillars', note: 'The five ideas under everything here, how each works inside you and between you and others, and where each one shows up' },
      { href: '/how-it-works.html', deep: true, code: '', title: 'How it works', note: 'A friendly tour of what the program looks at, and why you can skip the technical bits' },
      { href: '/contents.html', deep: true, code: '', title: 'Contents', note: 'Everything in the program, in three parts, plus the full site directory' },
      { href: '/ways-in.html', deep: true, code: '', title: 'Ways in', note: 'Free while it’s being built: what each level opens, and what it shares' },
      { href: '/is-this-for-you.html', deep: true, code: '', title: 'Is this right for you?', note: 'What the program is and isn’t, who it helps, and a guide to every section' },
      { href: '/relationships.html', deep: true, code: '', title: 'How it fits your relationships', note: 'How every part of the program connects to yourself, partners, family, friends, roommates, co-parents, coworkers and caregivers' },
      { href: '/quick-checks.html', code: '', title: 'Today’s Weather', note: 'A one-minute read on your own conditions today, and what today is good for' },
      { href: '/frequency-framework.html', deep: true, code: '', title: 'The Frequency Framework', note: 'Why two kind people can fall out of step, and how to find the same rhythm again' },
      { href: '/infographic.html', code: '', title: 'The whole idea on one page', note: 'A printable one-page summary, easy to share' },
      { href: '/glossary.html', code: '', title: 'Glossary: the words, in plain English', note: 'Every word the site uses in one plain sentence with an example, and each tool’s plain and technical names' }
    ]},
    { id: 'guides', title: 'Guides', blurb: 'Plain, practical guides to the questions people ask most, each linked to the free tools that help.', items: [
      { href: '/invisible-labor-mental-load.html', code: 'Guide', title: 'Invisible labor and the mental load', note: 'What the mental load is, everyday examples, and five calm steps to share it fairly' },
      { href: '/chore-chart-for-couples.html', code: 'Print', title: 'A fair chore chart for couples', note: 'A free, printable chore chart with one owner per job, for couples, families and roommates' },
      { href: '/how-to-stop-fighting-with-your-partner.html', code: 'Guide', title: 'How to stop fighting with your partner', note: 'Seven calm steps, from the first sign to fixing the setup behind repeat fights' },
      { href: '/pursue-withdraw.html', code: 'Guide', title: 'One wants to talk now, one needs space', note: 'Both sides of the same fight, and a pause plan with a return time' },
      { href: '/love-languages.html', deep: true, code: 'Guide', title: 'Love languages: a menu, not a label', note: 'What is healthy and unhealthy about each of the five, how to practice and talk about them, and ideas like them' },
      { href: '/languages-of-connection.html', code: 'New', title: 'How the languages fit together', note: 'Love, apology and appreciation languages, touchstones and your wiring in one picture, with what to reach for when' },
      { href: '/neurodivergent-relationships.html', code: 'Guide', title: 'Neurodivergent relationships', note: 'Practical tips for ADHD, autistic and AuDHD couples and families' },
      { href: '/communication-style-quiz.html', code: 'Quiz', title: 'Communication style quiz', note: 'What the Wavelength quiz looks at, the four Wave Code letters, and how to use your result' },
      { href: '/complacency.html', deep: true, code: 'Guide', title: 'Complacency', note: 'Why “it’s fine” stops being checked, how it shows up in you, partners, family, friends, housemates and coworkers, and the small re-checks that keep things alive' }
    ]},
    { id: 'self', title: 'Self-discovery', blurb: 'Tools for understanding yourself: your load, your wiring, your patterns. Start here, with or without anyone else.', items: [
      { href: '/self-path.html', code: 'Start', title: 'Your self-discovery path', note: 'The self path, step by step: your battery, your wiring, what settles you and kind words, on your own' },
      { href: '/workpapers/fill/suite.html?road=self', code: 'Workpapers', title: 'Workpapers for you', note: 'The “Just me” road: the worksheets for the self path, in order, fillable and printable' },
      { href: '/quick-checks.html#today', code: 'Daily', title: 'Today’s Weather', note: 'One minute on your own conditions: a forecast, a talk window, what today is good for, and an optional 7-day log of your patterns' },
      { href: '/know-yourself.html', deep: true, code: 'New', title: 'Know your own wiring', note: 'What’s you, what life taught you, and what’s just today, and how to explain each one to others' },
      { href: '/complacency.html', deep: true, code: 'New', title: 'Complacency', note: 'What you’ve stopped checking in yourself, and a small monthly way to look again' },
      { href: '/growing-up.html', deep: true, code: 'New', title: 'Where your lens came from', note: 'How each stage of growing up shapes what you expect of yourself and others, and how to choose which rules to keep' },
      { href: '/wired-differently.html', deep: true, code: 'New', title: 'Wired Differently', note: 'How differently wired people hear the same words, and how to talk across the difference' },
      { href: '/wiring-card.html', code: 'Tool', title: 'Wiring Card', note: 'A one-page card on how you receive words, what silence means, and what to avoid' },
      { href: '/wavelength.html', code: 'New', title: 'Wavelength', note: 'How you think, talk and listen: pick your wiring, find your four-letter Wave Code and archetype, and read sixteen self-discovery chapters' },
      { href: '/workpapers/wp-02-how-much-are-you-carrying.html', deep: true, code: 'WP-02', title: 'How much are you carrying?', note: 'What you’re already carrying, separate from what just happened', paid: true },
      { href: '/tools/frequency-calibration.html', code: 'Tool', title: 'Find your natural rhythms', note: 'Your natural rhythms for money, decisions, check-ins and recovery', paid: true },
      { href: '/wp-11.html', deep: true, code: 'WP-11', title: 'The Calm-Down Kit', note: 'Decide in advance what settles your body', paid: true },
      { href: '/book/chapter-3.html', deep: true, code: 'III', title: 'Full tanks and different angles', note: 'Why some reactions are bigger than their cause', paid: true },
      { href: '/learn/index.html#part-self', deep: true, code: 'Stories', title: 'Stories from Philosophy: Knowing yourself', note: 'The Second Arrow, the Ship of Theseus, What Is Up to Us' },
    ]},
    { id: 'play', title: 'Play', blurb: 'Calm games for a busy mind: a gentle way to read your state and settle it (Pillar III) before you talk. No timers and no way to lose, and something new in the background every few levels.', items: [
      { href: '/pause-and-play.html', code: 'All', title: 'Pause & Play', note: 'All the calm games in one place, with your level and your garden' },
      { href: '/recheck-drive.html', code: 'New', title: 'The Re-check Drive', note: 'A calm football game: do the small, kind things from the complacency playbook, and the ball moves toward a field goal. No clock, no way to lose' },
      { href: '/bears-dojo.html', code: 'New', title: 'The Bears Dojo', note: 'Wander a temple garden while Tidbit and Sugarfoot tend it, build your own bear, then step inside for something gentle and always different' },
      { href: '/frequency-journey.html', code: 'New', title: 'Tidbit and Sugarfoot’s Arcade', note: 'Five gentle classic games with Tidbit and Sugarfoot: a maze chase, a crossing, a wagon-trail journey, a brick breaker and a catch game' },
      { href: '/calm-visualizer.html', code: 'New', title: 'Drift: calm visualizer', note: 'Pick how you feel. Slow, deep 3D colors and binaural tones (headphones on) ease you toward calm. Pillar III: settle first' },
      { href: '/night-garden.html', code: 'New', title: 'The Night Garden', note: 'A calm place to breathe, play and let your mind settle. Flowers bloom as you breathe; no timers, nothing to lose' },
      { href: '/word-bloom.html', code: 'New', title: 'Word Bloom', note: 'Swipe across the petals to spell words. Hundreds of gentle levels and a bonus jar, and every few levels something new appears in the background' },
      { href: '/quiet-crossword.html', code: 'New', title: 'Quiet Crossword', note: 'Small, friendly crosswords in five gentle levels, made for playing on a phone' },
      { href: '/daily-ledger-crossword.html', code: 'New', title: 'The Daily Ledger Crossword', note: 'A newspaper-style crossword, from a quick 5x5 Mini to a Big Sunday 13x13' },
      { href: '/quiet-words.html', code: 'Game', title: 'Quiet Words', note: 'A gentle word search with a new theme in every puzzle. Every word you find leaves a kind thought behind' },
    ]},
    { id: 'relationships', title: 'Relationships', blurb: 'Where to start in each kind of relationship, and every tool that fits. The shared tools themselves live under The book, Workpapers and Tools.', items: [
      { href: '/turning-toward.html', deep: true, code: 'New', title: 'Turning toward', note: 'Seven small, everyday ways to build connection with anyone who matters to you' },
      { href: '/check-ins.html', deep: true, code: 'Guide', title: 'Check-ins', note: 'How to have a tender conversation kindly: a good time and place, listening first, and an ending that feels good to both' },
      { href: '/complacency.html', deep: true, code: 'New', title: 'Complacency', note: 'Why “it’s fine” stops being checked, how it shows up in you, partners, family, friends, housemates and coworkers, and the small re-checks that keep things alive' },
      { href: '/recheck-drive.html', code: 'Game', title: 'The Re-check Drive', note: 'A calm football game made from the complacency playbook: real actions move the ball toward a field goal' },
      { href: '/relationships.html#partners', deep: true, code: '', title: 'Partners', note: 'Start with who did what, one owner per job, and the daily check-in' },
      { href: '/relationships.html#family', deep: true, code: '', title: 'Family', note: 'Start with getting back in tune, one owner per job, and saying it so it lands' },
      { href: '/relationships.html#co-parents', deep: true, code: '', title: 'Co-parents', note: 'Start with one owner per job, saying it so it lands, and the monthly look-back' },
      { href: '/relationships.html#friends', deep: true, code: '', title: 'Friends', note: 'Start with Turning Toward, the Conversation Reader, and saying it so it lands' },
      { href: '/relationships.html#roommates', deep: true, code: '', title: 'Roommates', note: 'Start with the Lemonade Stand, one owner per job, and the daily check-in' },
      { href: '/relationships.html#coworkers', deep: true, code: '', title: 'Coworkers & teams', note: 'Start with one owner per job, getting back in tune, and saying it so it lands' },
      { href: '/work.html', code: 'New', title: 'At work', note: 'The plain version for teams, with no cartoons: one owner per job, messages, appreciation, a team session' },
      { href: '/relationships.html#caregivers', deep: true, code: '', title: 'Caregivers', note: 'Start with your battery, one owner per job, and the Calm-Down Kit' },
      { href: '/full-path.html', code: 'Package', title: 'The workpaper package and report', note: 'One fillable PDF for your relationship, and a detailed report from your answers: findings, recommendations and a plan' },
      { href: '/relationships.html#map', deep: true, code: 'Map', title: 'The full map', note: 'Every chapter, worksheet and tool, for every kind of relationship' },
      { href: '/grandparents.html', code: 'New', title: 'For grandparents', note: 'Help with the grandkids without taking over: fair childcare, house rules and saying no kindly' },
      { href: '/grief.html', code: 'New', title: 'Grief and later life', note: 'Loss, family after a loss, reconnecting, and starting a new chapter' },
      { href: '/parents.html', code: '', title: 'For parents', note: 'Big feelings, siblings who fight, teens, and watching the pups together' },
      { href: '/teens.html', code: '', title: 'For teens', note: 'Parents, friends, feelings and dating, written for you' },
      { href: '/groups.html', code: '', title: 'Leading a group', note: 'A six-session guide with discussion questions and handouts' },
      { href: '/friends.html', code: 'New', title: 'Friends', note: 'When a friendship drifts, you’re always the one reaching out, or life changes pull you apart' },
      { href: '/more-than-two.html', code: 'New', title: 'More than two partners', note: 'Polyamorous homes and triads: sharing the load, and joining a home without feeling like a guest' },
      { href: '/gaming-and-time-together.html', code: 'New', title: 'Gaming, phones and time together', note: 'A calm talk with no blame, and a small time-together deal to fill in' },
      { href: '/money-together.html', code: 'New', title: 'Money together', note: 'Saver and spender, moving in, wedding costs, family expectations, and normal limits versus control' },
      { href: '/when-one-is-ill.html', code: 'New', title: 'When one of you is ill', note: 'Chronic illness or disability: sharing the load without anyone feeling a burden' },
      { href: '/coming-home.html', code: 'New', title: 'Coming home after time apart', note: 'After deployment, work away or a hospital stay: a handover week and finding your place again' },
      { href: '/different-hours.html', code: 'New', title: 'Different hours', note: 'Night shifts, shift work, or one of you works from home and seems always available' },
      { href: '/two-faiths.html', code: 'New', title: 'Two faiths, one family', note: 'Two faiths or cultures under one roof: holidays, naming the baby and family expectations' },
      { href: '/foster-and-kinship.html', code: 'New', title: 'Foster, adoptive and kinship families', note: 'Including grandparents raising grandchildren' },
      { href: '/adhd-kids.html', code: 'New', title: 'When a child has ADHD', note: 'For parents and grandparents: routines, kind words and looking after yourselves' },
      { href: '/grown-up-children.html', code: 'New', title: 'Grown-up children and parents', note: 'Boundaries with a parent you love: visits, advice and the new baby' },
      { href: '/family-rifts.html', code: 'New', title: 'Family rifts and estrangement', note: 'Adult siblings, a will, a favourite child, years of silence' },
      { href: '/empty-nest.html', code: 'New', title: 'When the kids have left home', note: 'An empty nest and a quiet house: finding each other again' },
      { href: '/coming-out.html', code: 'New', title: 'Coming out as an adult', note: 'To family, at work or with a partner, at your own pace' },
      { href: '/on-my-own.html', code: 'New', title: 'On my own after a breakup or divorce', note: 'Building a life again, and part-time parenting when the kids are with you some days' },
      { href: '/sharing-a-room.html', code: 'New', title: 'Sharing a room', note: 'Dorm or flat: a room agreement to fill in together' },
      { href: '/for-counselors.html', code: 'New', title: 'For counsellors, coaches and group leaders', note: 'Using these free pages and tools with clients and groups' }
    ]},
    { id: 'book', title: 'The book', blurb: 'Part One is the most important: yourself. Part Two is between us, one idea per chapter, each paired with a workpaper that puts it to use.', items: [
      { sub: 'Part One: The most important, yourself' },
      { href: '/book/self-1-then.html', deep: true, code: 'Then', title: 'Where you came from', note: 'Where your lens came from: growing up, old rules and what life taught you' },
      { href: '/book/self-2-now.html', deep: true, code: 'Now', title: 'Who you are today', note: 'Your wiring, your weather and your words, and what is fair to you' },
      { href: '/book/self-3-next.html', deep: true, code: 'Next', title: 'Who you are becoming', note: 'What matters to you, one small goal, tiny steps and a kind monthly look at yourself' },
      { sub: 'Part Two: Between us' },
      { href: '/book/preface.html', deep: true, code: 'Preface', title: 'The work nobody sees', note: 'The quiet, unseen work of running a shared life, and why it deserves to be noticed' },
      { href: '/book/chapter-1.html', deep: true, code: 'I', title: 'Why we get out of tune', note: 'How pace, tone and urgency nudge two people out of sync, and how to get back in tune' },
      { href: '/book/chapter-2.html', deep: true, code: 'II', title: 'Is the split working?', note: 'A simple way to see whether the way you share the work can last. It looks at the arrangement, never at a person' },
      { href: '/book/chapter-3.html', deep: true, code: 'III', title: 'Full tanks and different angles', note: 'How much of a reaction is leftover stress, and the seven angles people see things from', paid: true },
      { href: '/book/chapter-4.html', deep: true, code: 'IV', title: 'Two kinds of fair', note: 'Agreeing on what fair means to you both, and letting words land before you react', paid: true },
      { href: '/book/chapter-5.html', deep: true, code: 'V', title: 'The monthly look-back', note: 'A gentle monthly look back that catches what weekly check-ins miss', paid: true },
      { sub: 'The book by topic' },
      { href: '/book/topic-start-here.html', code: 'Topic', title: 'The book at a glance', note: 'Where to start in the book, on your own or with others' },
      { href: '/book/topic-share-the-load.html', code: 'Topic', title: 'The book on sharing the load', note: 'Every chapter’s part on sharing the work, plus the tools that go with it' },
      { href: '/book/topic-talk-it-through.html', code: 'Topic', title: 'The book on talking it through', note: 'Every chapter’s part on talking and listening, plus the tools' },
      { href: '/book/topic-know-yourself.html', code: 'Topic', title: 'The book on knowing yourself', note: 'Every chapter’s part about you, plus the self tools and workpapers' },
      { href: '/book/topic-calm.html', code: 'Topic', title: 'The book on staying calm', note: 'Every chapter’s part on settling, plus the calm tools' },
      { href: '/library.html', code: 'Library', title: 'The Professor’s Library', note: 'Psychology, behavioral science and conflict resolution in plain words: 235 short entries, each tied to the Five Pillars and the program' },
    ]},
    { id: 'workpapers', title: 'Workpapers', blurb: 'Short worksheets. Each of you fills in your own, then you read them together. They work best in the order listed, with the monthly look-back once a month.', items: [
      { href: '/full-path.html', code: 'Package', title: 'The workpaper package and report', note: 'One fillable PDF for your relationship, and a detailed report from your answers: findings, recommendations and a plan' },
      { href: '/workpapers/wp-01.html', deep: true, code: 'WP-01', title: 'Who did what, and kind ways to say no', note: 'Start here: a week’s log of who did what, plus kind ways to say no', paid: true },
      { href: '/workpapers/wp-02-how-much-are-you-carrying.html', deep: true, code: 'WP-02', title: 'How much are you carrying?', note: 'Five quick questions: how much are you already carrying today?', paid: true },
      { href: '/workpapers/wp-03-one-owner-per-job.html', deep: true, code: 'WP-03', title: 'One owner per job', note: 'Give every regular job one owner, so nobody has to keep asking', paid: true },
      { href: '/workpapers/wp-04-what-keeps-coming-back.html', deep: true, code: 'WP-04', title: 'What keeps coming back?', note: 'The monthly look-back: what keeps coming up, and what’s really behind it', paid: true },
      { href: '/workpapers/wp-09-say-it-so-it-lands.html', deep: true, code: 'WP-09', title: 'Say it so it lands', note: 'Turn a big feeling into a fact, a feeling and a kind ask before you send it', paid: true },
      { href: '/wp-11.html', deep: true, code: 'WP-11', title: 'The Calm-Down Kit', note: 'Ways to settle your body first, when either of you is too wound up to talk', paid: true },
      { href: '/workpapers/wp-13-daily-check-in.html', deep: true, code: 'WP-13', title: 'The 90-second daily check-in', note: 'Ninety seconds a day, no debating, to keep small things small', paid: true },
      { href: '/do/index.html', code: '', title: 'Try the Workpapers', note: 'A playground to try the worksheets before you commit' },
      { href: '/workpapers/fill/suite.html', code: 'Suite', title: 'The Workpaper Suite', note: 'New: the worksheets for your situation, in order, as one fillable PDF and a report' },
      { href: '/workpapers/fill/index.html', code: 'Fill-in', title: 'Fill-in workpapers', note: 'Type straight into the worksheets and save them as PDFs on your device' }
    ]},
    { id: 'program', title: 'Guided program', blurb: 'For anyone who’d like to be walked through it, one gentle step at a time.', items: [
      { href: '/program.html', code: 'Guide', title: 'Which part to use when', note: 'The six weeks, the Workpaper Suite, the package and report, and the indexes, side by side' },
      { href: '/prog-01.html', deep: true, code: 'PROG-01', title: 'Six gentle weeks', note: 'One worksheet a week, in order, ending with a before-and-after look', paid: true },
      { href: '/workpapers/report-01.html', deep: true, code: 'REPORT-01', title: 'Your progress, week by week', note: 'Your week-by-week record, so progress builds instead of starting over', paid: true }
    ]},
    { id: 'tools', title: 'Tools', blurb: 'Interactive pages. Everything you type stays in your own browser.', items: [
      { href: '/ask.html', code: 'New', title: 'Chat with Professor Puddles', note: 'Ask a question in your own words and get an answer made only from this site’s pages. Nothing you type leaves your device' },
      { href: '/conversation-reader.html', code: 'New', title: 'The Conversation Reader', note: 'Paste a text thread, chat or email exchange: see where it turned, what each of you may be hearing, and a calmer way to answer' },
      { href: '/lemonade-stand.html', code: 'Tool', title: 'The Lemonade Stand', note: 'List who did what to keep the household running this week, and see the split as a plain fact' },
      { href: '/wiring-card.html', code: 'New', title: 'Wiring Card', note: 'Make a one-page card for how you receive words, what silence means, and what to avoid' },
      { href: '/wavelength.html', code: 'New', title: 'Wavelength', note: 'A communication style guide: your wiring, your Wave Code, the 9 inputs of learning, a personal statement and a way to compare with someone' },
      { href: '/signal-translator.html', code: 'New', title: 'The Signal Translator', note: 'Test a sentence before a check-in. Pick the wiring, the room, and how it might land' },
      { href: '/perspective-shifter.html', code: 'New', title: 'The Perspective Shifter', note: 'See a moment from their side: their state, wiring, surroundings, and what each of you could see' },
      { href: '/carrier-wave-decoder.html', code: 'Tool', title: 'The Carrier Wave Decoder', note: 'A guided session for the moment a conversation starts going sideways' },
      { href: '/workpapers/calculators/is-the-setup-working-quick.html', code: 'CALC-01', title: 'Is the setup working for everyone?', note: 'Add your worksheet numbers and see whether the way you share the load is working' },
      { href: '/is-the-setup-working.html', code: 'CALC-01', title: 'Is the setup working for everyone? The long form', note: 'Enter hours and jobs for 2–8 people and see the math step by step', menu: false },
      { href: '/tools/soften-a-tense-moment.html', code: 'Tool', title: 'Soften a tense moment', note: 'Small, kind ways to shift a heavy mood: a printable plan builder, five scenarios and a four-week practice plan' },
      { href: '/tools/soften-a-tense-moment-full.html', code: 'Tool', title: 'Soften a tense moment: the full toolkit', note: 'Five everyday scenarios and a four-week practice plan', paid: true, menu: false },
      { href: '/tools/frequency-calibration.html', code: '', title: 'Find your natural rhythms', note: 'Compare your rhythms across five areas of daily life', paid: true },
      { href: '/tools/frequency-sync-visualizer.html', code: '', title: 'Watch two rhythms sync', note: 'A moving picture of how the daily check-in keeps two people in step', paid: true },
      { href: '/snapshot/index.html', code: '', title: 'A quick snapshot', note: 'A two-minute look at how things are right now' }
    ]},
    { id: 'media', title: 'Media', blurb: 'Tidbit and Sugarfoot’s movies and live pal cam, music and audio for settling first (Pillar III), and conversations about all five pillars.', items: [
      { href: '/frequency-buddies.html', code: 'Movies', title: 'Tidbit & Sugarfoot: Frequency Buddies', note: 'Five animated adventures with the two pals, with voices, music and captions, about 16 minutes each' },
      { href: '/frequency-buddies-shuffle.html', code: 'Shuffle', title: 'Frequency Buddies on shuffle', note: 'Episode after episode in a random order, and every episode to download' },
      { href: '/frequency-buddies-live.html', code: 'On air', title: 'Frequency Buddies Live', note: 'An always-on station: drop in on the episode playing now, or cast it to your TV' },
      { href: '/pal-cam-tv.html', code: 'Live', title: 'Tidbit & Sugarfoot: Pal Cam TV', note: 'The pals live, all day, full screen or cast to your TV, with music and the sounds of each place' },
      { href: '/reading.html', code: 'Articles', title: 'Articles to read', note: 'Hand-picked articles from Psychology Today, Greater Good, the Gottman Institute and more, grouped by topic and fresh every visit' },
      { href: '/soundscapes.html', code: 'Audio', title: 'Brain Breakers', note: 'Four instrumental pieces to see and feel, by Christian’s Lab' },
      { href: '/echoes-of-gold.html', code: 'Album', title: 'Echoes of Gold', note: 'The companion album: the music that came before the framework, for settling first (Pillar III)' },
      { href: '/podcast-index.html', code: 'Podcast', title: 'The Podcast', note: 'Friendly conversations with Kane and Christian about the ideas behind it all' }
    ]},
    { id: 'about', title: 'About & status', blurb: 'Who made this and why, what’s finished so far, and the site’s policies.', items: [
      { href: '/about.html', code: '', title: 'About the creator', note: 'The person behind it, their story, and why this exists' },
      { href: '/polymath.html', code: '', title: 'The polymath way', note: 'How every field grows from the same few roots, and how thirteen of them became one program' },
      { href: '/method-and-limits.html', code: '', title: 'Method and limits', note: 'Every score, formula and cut-off on the site, written out, with what each can’t tell you' },
      { href: '/program-overview.html', deep: true, code: '', title: 'Program Overview', note: 'How the chapters, workpapers and calculators fit together' },
      { href: '/suite-index.html', deep: true, code: '', title: 'Suite Index', note: 'The official list of what’s built today. If it isn’t here, it isn’t live yet' },
      { href: '/roadmap.html', code: '', title: 'Content Roadmap', note: 'What’s live, what’s being written, and what’s planned' },
      { href: '/telemetry.html', code: '', title: 'Rollout Status', note: 'How much of the planned program is finished, counted plainly' },
      { href: '/membership.html', code: '', title: 'Email updates', note: 'Everything is open; leave your email if you’d like a short note when something new ships' },
      { href: '/on-this-device.html', code: '', title: 'What’s stored on this device', note: 'Everything this site keeps in your browser, in plain words, with a button to erase each one' },
      { href: '/legal/privacy-policy.html', code: '', title: 'Privacy policy', note: 'What’s collected, who holds it, and your rights' },
      { href: '/legal/terms-of-service.html', code: '', title: 'Terms of service', note: 'The rules for using the site' },
      { href: '/legal/refund-policy.html', code: '', title: 'Refund policy', note: 'How cancellations and refunds will work once paid membership launches' }
    ]}
  ];

  // ===== The menu: what the top bar and the "Menu" panel show =====
  // SECTIONS above stays the full list of pages (it sets each page's lock, previous/next links and look,
  // and the Contents page lists all of it). MENU is the shorter, grouped view people browse:
  // each page once, most-used first. Members locks come from SECTIONS automatically.
  // { sub: 'Name' } starts a small heading inside a group. A page left out of MENU is still on
  // the Contents page (/contents.html, linked in every footer as "All pages").
  var MENU = [
    { id: 'start', pick: ['/start-here.html', '/upset-right-now.html', '/ask.html', '/relationships.html', '/co-parenting.html', '/sent-this.html', '/safety.html'], name: 'Start here', title: 'Start here', blurb: 'New here? A gentle first step, and a way in for your own situation.', items: [
      { href: '/book/topic-start-here.html', code: 'Book', title: 'The book at a glance', note: 'Where to start in the book, on your own or with others' },
      { href: '/start-here.html', code: 'Start', title: 'Start here', note: 'What this is in one minute, and your best first step' },
      { href: '/start-in-10-minutes.html', code: '10 min', title: 'Start in 10 minutes', note: 'Today’s weather, the Preface, one card and one thing logged' },
      { href: '/upset-right-now.html', code: 'Now', title: 'Upset right now?', note: 'A five-minute page for two upset people: pause, breathe, come back' },
      { href: '/safety.html', code: 'Safety', title: 'Not safe at home?', note: 'If someone hurts, threatens, watches or controls you: hotlines, leaving quickly, clearing this site' },
      { href: '/quick-checks.html#today', code: 'Daily', title: 'Today’s Weather', note: 'A one-minute read on how you’re doing today' },
      { href: '/ask.html', code: 'Chat', title: 'Ask Professor Puddles', note: 'Ask in your own words. Answers come only from this site' },
      { href: '/surprise.html', code: 'Wander', title: 'Surprise me', note: 'One button picks a game, a guide or something calm' },
      { href: '/sent-this.html', title: 'Sent this by someone?', note: 'What they see, what stays yours, and how to say no kindly' },
      { href: '/install.html', code: 'App', title: 'Get the app', note: 'Install in a few taps: its own icon, full screen, works offline' },
      { href: '/whats-new.html', code: 'New', title: 'What’s new', note: 'Everything newly added, with dates' },
      { sub: 'Find your situation' },
      { href: '/relationships.html', deep: true, code: 'All', title: 'Where to start in your relationship', note: 'Partners, family, co-parents, friends, roommates, coworkers and caregivers' },
      { href: '/en-espanol.html', code: 'New', title: 'En español', note: 'Una página corta en español' },
      { sub: 'Couples' },
      { href: '/long-distance.html', code: 'New', title: 'Long-distance and apart', note: 'Calls, time zones and short texts' },
      { href: '/coming-home.html', code: 'New', title: 'Coming home after time apart', note: 'After deployment, work away or a hospital stay' },
      { href: '/different-hours.html', code: 'New', title: 'Different hours', note: 'Night shifts, shift work, or one of you works from home' },
      { href: '/money-together.html', code: 'New', title: 'Money together', note: 'Saver and spender, moving in, wedding costs' },
      { href: '/gaming-and-time-together.html', code: 'New', title: 'Gaming, phones and time together', note: 'A calm talk and a small time-together deal' },
      { href: '/two-faiths.html', code: 'New', title: 'Two faiths, one family', note: 'Holidays, naming the baby and family expectations' },
      { href: '/more-than-two.html', code: 'New', title: 'More than two partners', note: 'Polyamorous homes and triads, sharing the load' },
      { href: '/when-one-is-ill.html', code: 'New', title: 'When one of you is ill', note: 'Chronic illness or disability, without anyone feeling a burden' },
      { href: '/neurodivergent-relationships.html', code: 'Guide', title: 'Neurodivergent relationships', note: 'Tips for ADHD and autistic couples and families' },
      { sub: 'Parents and family' },
      { href: '/new-parent.html', code: 'New', title: 'New baby, sharing the load', note: 'Three steps for the baby jobs and the invisible ones' },
      { href: '/parents.html', code: 'New', title: 'For parents', note: 'Big feelings, siblings who fight, teens, and watching the pups together' },
      { href: '/adhd-kids.html', code: 'New', title: 'When a child has ADHD', note: 'For parents and grandparents' },
      { href: '/co-parenting.html', code: 'New', title: 'Separated co-parents', note: 'Calmer handoffs, a tone check, and a route for a co-parent who won’t cooperate' },
      { href: '/parents.html#stepfamilies', code: 'New', title: 'Stepfamilies and blended families', note: 'The parent in the middle, the stepparent’s place, and children in two homes' },
      { href: '/foster-and-kinship.html', code: 'New', title: 'Foster, adoptive and kinship families', note: 'Including grandparents raising grandchildren' },
      { href: '/grandparents.html', title: 'For grandparents', note: 'Help with the grandkids without taking over' },
      { href: '/grown-up-children.html', code: 'New', title: 'Grown-up children and parents', note: 'Boundaries with a parent you love' },
      { href: '/family-rifts.html', code: 'New', title: 'Family rifts and estrangement', note: 'Adult siblings, a will, years of silence' },
      { href: '/family-obligations.html', code: 'New', title: 'Supporting family, money home', note: 'A duty you plan around together' },
      { href: '/teens.html', code: 'New', title: 'For teens', note: 'Parents, friends, feelings and dating, written for you' },
      { sub: 'Life changes' },
      { href: '/on-my-own.html', code: 'New', title: 'On my own after a breakup', note: 'Building a life again, and part-time parenting' },
      { href: '/coming-out.html', code: 'New', title: 'Coming out as an adult', note: 'To family, at work or with a partner' },
      { href: '/empty-nest.html', code: 'New', title: 'When the kids have left home', note: 'Finding each other again in a quiet house' },
      { href: '/retired-together.html', code: 'New', title: 'Retired and both home now', note: 'Sharing the house all day, kindly' },
      { href: '/caregivers.html', code: 'New', title: 'Caring for someone you love', note: 'When they can’t share the load back' },
      { href: '/grief.html', code: 'New', title: 'Grief and later life', note: 'Loss, family after a loss, and a new chapter' },
      { sub: 'Friends, roommates and work' },
      { href: '/friends.html', code: 'New', title: 'Friends', note: 'When a friendship drifts, or you’re always the one reaching out' },
      { href: '/sharing-a-room.html', code: 'New', title: 'Sharing a room', note: 'Dorm or flat: a room agreement to fill in together' },
      { href: '/share-the-load.html#roommates', title: 'Roommates and housemates', note: 'Chores, bills and a ten-minute house meeting' },
      { href: '/work.html', code: 'New', title: 'At work and business partners', note: 'The plain version for teams and co-owners, with no cartoons' },
      { href: '/groups.html', code: 'New', title: 'Leading a group', note: 'Six sessions with discussion questions and handouts, no sign-up' },
      { href: '/for-counselors.html', code: 'New', title: 'For counsellors and coaches', note: 'Using these free pages with clients and groups' }
    ]},
    { id: 'load', pick: ['/share-the-load.html', '/lemonade-stand.html', '/workpapers/wp-03-one-owner-per-job.html', '/invisible-labor-mental-load.html', '/money-together.html', '/work.html', '/caregivers.html'], name: 'Share the load', title: 'Share the load', blurb: 'Split the work at home fairly, step by step. What you type stays on your device.', items: [
      { href: '/family-obligations.html', code: 'Guide', title: 'Family, money and in-laws', note: 'Supporting parents, money home, long visits: plan it together' },
      { href: '/book/topic-share-the-load.html', code: 'Book', title: 'The book on sharing the load', note: 'Every chapter’s part on sharing the work, plus the tools that go with it' },
      { href: '/share-the-load.html', code: 'Start', title: 'Share the load: tools, in order', note: 'Which tool to use first, and what comes next' },
      { href: '/invisible-labor-mental-load.html', code: 'Guide', title: 'Invisible labor and the mental load', note: 'What it is, and five calm steps to share it' },
      { href: '/chore-chart-for-couples.html', code: 'Print', title: 'A fair chore chart', note: 'Free and printable, one owner per job' },
      { href: '/lemonade-stand.html', code: 'Tool', title: 'The Lemonade Stand', note: 'List who did what this week, and see the split plainly' },
      { href: '/workpapers/wp-03-one-owner-per-job.html', deep: true, code: 'WP-03', title: 'One owner per job', note: 'So nobody has to keep asking' },
      { sub: 'For your situation' },
      { href: '/money-together.html', code: 'New', title: 'Money together', note: 'Saver and spender, moving in, wedding costs, and normal limits versus control' },
      { href: '/work.html', code: 'New', title: 'At work and business partners', note: 'One owner and a backup for every job, for teams and co-owners' },
      { href: '/caregivers.html', code: 'New', title: 'Caring for someone you love', note: 'When they can’t share the load back, and where to find respite' },
      { href: '/when-one-is-ill.html', code: 'New', title: 'When one of you is ill', note: 'Sharing the load with fewer spoons, without anyone feeling a burden' },
      { href: '/different-hours.html', code: 'New', title: 'Different hours', note: 'Night shifts, shift work, or one of you works from home' },
      { href: '/sharing-a-room.html', code: 'New', title: 'Sharing a room', note: 'Dorm or flat: guests, quiet hours, sleep and cleaning' },
      { sub: 'Go further' },
      { href: '/workpapers/wp-01.html', deep: true, code: 'WP-01', title: 'Who did what', note: 'A week’s log, plus kind ways to say no' },
      { href: '/workpapers/calculators/is-the-setup-working-quick.html', code: 'CALC-01', title: 'Is the setup working for everyone?', note: 'Add your numbers and see if the split works' },
      { href: '/workpapers/wp-13-daily-check-in.html', deep: true, code: 'WP-13', title: 'The 90-second daily check-in', note: 'Keep small things small' },
      { href: '/workpapers/wp-04-what-keeps-coming-back.html', deep: true, code: 'WP-04', title: 'What keeps coming back?', note: 'The monthly look-back' },
      { href: '/prog-01.html', deep: true, code: '6 weeks', title: 'Six gentle weeks', note: 'One worksheet a week, in order' },
      { href: '/workpapers/fill/suite.html', code: 'Suite', title: 'The Workpaper Suite', note: 'Every worksheet for your household or group, fillable and printable' },
      { href: '/full-path.html', code: 'Package', title: 'The package and report', note: 'One PDF for your relationship, and a report from your answers' },
      { href: '/program.html', title: 'Which part to use when', note: 'The six weeks, the suite and the package, side by side' }
    ]},
    { id: 'talk', pick: ['/how-to-stop-fighting-with-your-partner.html', '/pursue-withdraw.html', '/signal-translator.html', '/conversation-reader.html', '/turning-toward.html', '/long-distance.html'], name: 'Talk it through', title: 'Talk it through', blurb: 'Say it kindly, hear it fully, and keep small things small. What you type stays on your device.', items: [
      { href: '/book/topic-talk-it-through.html', code: 'Book', title: 'The book on talking it through', note: 'Every chapter’s part on talking and listening, plus the tools' },
      { href: '/how-to-stop-fighting-with-your-partner.html', code: 'Guide', title: 'How to stop fighting with your partner', note: 'Seven calm steps' },
      { href: '/pursue-withdraw.html', code: 'Guide', title: 'One wants to talk now, one needs space', note: 'A pause plan you agree' },
      { href: '/check-ins.html', deep: true, title: 'Check-ins', note: 'How to have a tender conversation kindly' },
      { href: '/turning-toward.html', deep: true, title: 'Turning toward', note: 'Seven small, everyday ways to connect' },
      { href: '/love-languages.html', deep: true, code: 'New', title: 'Love languages', note: 'What’s healthy and unhealthy about each, how to practice them, and ideas like them' },
      { href: '/touchstones.html', deep: true, code: 'New', title: 'Touchstones', note: 'The shared words, jokes and rituals that say we are us, and how to keep them fresh' },
      { href: '/apology-languages.html', code: 'New', title: 'Apology languages', note: 'The parts of a sorry that help after a hurt, and what research says works' },
      { href: '/appreciation-at-work.html', code: 'New', title: 'Appreciation at work', note: 'Five ways people like to be thanked at work, as a menu, not a label' },
      { href: '/languages-of-connection.html', code: 'New', title: 'How the languages fit together', note: 'Love, apology and appreciation languages, touchstones and your wiring in one picture, with what to reach for when' },
      { href: '/complacency.html', deep: true, title: 'Complacency', note: 'Why “it’s fine” stops being checked, and the small re-checks that keep things alive' },
      { href: '/recheck-drive.html', code: 'Game', title: 'The Re-check Drive', note: 'Play out the complacency playbook, one real action at a time' },
      { sub: 'Tools for a message or a moment' },
      { href: '/signal-translator.html', code: 'Tool', title: 'The Signal Translator', note: 'How a sentence might land for someone wired differently' },
      { href: '/conversation-reader.html', code: 'Tool', title: 'The Conversation Reader', note: 'Paste a thread and see where it turned' },
      { href: '/perspective-shifter.html', code: 'Tool', title: 'The Perspective Shifter', note: 'See a moment from their side' },
      { href: '/carrier-wave-decoder.html', code: 'Tool', title: 'The Carrier Wave Decoder', note: 'For when a talk starts going sideways' },
      { href: '/workpapers/wp-09-say-it-so-it-lands.html', deep: true, code: 'WP-09', title: 'Say it so it lands', note: 'A fact, a feeling and a kind ask' },
      { href: '/tools/soften-a-tense-moment.html', code: 'Tool', title: 'Soften a tense moment', note: 'Small, kind ways to shift a heavy mood' }
    ]},
    { id: 'self', pick: ['/self-path.html', '/wavelength.html', '/wiring-card.html', '/workpapers/wp-02-how-much-are-you-carrying.html', '/wired-differently.html', '/neurodivergent-relationships.html'], name: 'Know yourself', title: 'Know yourself', blurb: 'Everything you can use on your own: understand your wiring, load and patterns, settle yourself, get ready for a hard talk, and read up, at your pace. Nothing here needs anyone else.', items: [
      { href: '/book/topic-know-yourself.html', code: 'Book', title: 'The book on knowing yourself', note: 'Every chapter’s part about you, plus the self tools and workpapers' },
      { sub: 'Start here, on your own' },
      { href: '/self-path.html', code: 'Start', title: 'Your self-discovery path', note: 'The self path, step by step, on your own' },
      { href: '/wavelength.html', code: 'New', title: 'Find your Wavelength', note: 'How you think, talk and listen: your Wave Code' },
      { href: '/quick-checks.html#today', code: 'Daily', title: 'Today’s Weather', note: 'A one-minute read on how you’re doing today' },
      { href: '/ask.html', code: 'Chat', title: 'Ask Professor Puddles', note: 'Ask in your own words. Answers come only from this site' },
      { sub: 'Know your own wiring' },
      { href: '/know-yourself.html', deep: true, title: 'Know your own wiring', note: 'What’s you, what life taught you, and what’s just today' },
      { href: '/growing-up.html', deep: true, title: 'Where your lens came from', note: 'How growing up shapes what you expect, and which rules to keep' },
      { href: '/wired-differently.html', deep: true, title: 'Wired Differently', note: 'How differently wired people hear the same words' },
      { href: '/wiring-card.html', code: 'Tool', title: 'Wiring Card', note: 'A one-page card on how you like to be spoken to' },
      { href: '/communication-style-quiz.html', code: 'Quiz', title: 'Communication style quiz', note: 'What the Wavelength quiz looks at, and how to use your result' },
      { href: '/tools/frequency-calibration.html', code: 'Tool', title: 'Find your natural rhythms', note: 'Your rhythms for money, decisions, check-ins and rest' },
      { href: '/neurodivergent-relationships.html', code: 'Guide', title: 'Neurodivergent relationships', note: 'Tips for ADHD, autistic and AuDHD readers' },
      { sub: 'Check your load' },
      { href: '/workpapers/wp-02-how-much-are-you-carrying.html', deep: true, code: 'WP-02', title: 'How much are you carrying?', note: 'Five quick questions about today’s load' },
      { href: '/lemonade-stand.html', code: 'Tool', title: 'The Lemonade Stand', note: 'Choose “just me” to see your own load for the week' },
      { href: '/invisible-labor-mental-load.html', code: 'Guide', title: 'Invisible labor and the mental load', note: 'What it is, and five calm steps to share it' },
      { sub: 'Settle yourself' },
      { href: '/wp-11.html', deep: true, code: 'WP-11', title: 'The Calm-Down Kit', note: 'Decide ahead of time what settles you' },
      { href: '/calm-visualizer.html', code: 'Drift', title: 'Drift: calm visualizer', note: 'Slow colors and tones matched to how you feel' },
      { href: '/night-garden.html', code: 'Breathe', title: 'The Night Garden', note: 'Breathe slowly and watch the flowers bloom' },
      { href: '/soundscapes.html', code: 'Audio', title: 'Soundscapes', note: 'Background audio for settling down' },
      { href: '/bears-dojo.html', code: 'New', title: 'The Bears Dojo', note: 'A temple garden and a quiet room of gentle things to do' },
      { href: '/pause-and-play.html', code: 'All', title: 'Pause & Play', note: 'All the calm games, your level and your garden' },
      { sub: 'Before you say it' },
      { href: '/workpapers/wp-09-say-it-so-it-lands.html', deep: true, code: 'WP-09', title: 'Say it so it lands', note: 'A fact, a feeling and a kind ask, before you send' },
      { href: '/signal-translator.html', code: 'Tool', title: 'The Signal Translator', note: 'Try a sentence and see how it might land' },
      { href: '/conversation-reader.html', code: 'Tool', title: 'The Conversation Reader', note: 'Paste a thread and see where it turned' },
      { href: '/perspective-shifter.html', code: 'Tool', title: 'The Perspective Shifter', note: 'See a moment from the other side' },
      { href: '/carrier-wave-decoder.html', code: 'Tool', title: 'The Carrier Wave Decoder', note: 'A guided session you can run alone, for when a talk goes sideways' },
      { sub: 'Worksheets and reading' },
      { href: '/workpapers/fill/suite.html?road=self', code: 'Suite', title: 'Workpapers for you', note: 'The “Just me” road: worksheets in order, fillable and printable' },
      { href: '/book/chapter-3.html', deep: true, code: 'III', title: 'Full tanks and different angles', note: 'Why some reactions are bigger than their cause' },
      { href: '/learn/index.html#part-self', deep: true, code: 'Stories', title: 'Stories from Philosophy: knowing yourself', note: 'The Second Arrow, the Ship of Theseus, What Is Up to Us' },
      { href: '/library.html', code: 'Library', title: 'The Professor’s Library', note: 'Psychology and conflict in plain words' },
      { href: '/reading.html', code: 'Articles', title: 'Articles to read', note: 'Hand-picked articles from trusted sources' },
      { href: '/glossary.html', code: 'Words', title: 'Glossary', note: 'Every word the site uses, in plain English' }
    ]},
    { id: 'read', pick: ['/book/topic-start-here.html', '/library.html', '/learn/index.html', '/reading.html', '/podcast-index.html', '/glossary.html'], name: 'Read & learn', title: 'Read & learn', blurb: 'The book, the library and the stories, in one place. Each page has a short version and a deeper one.', items: [
      { sub: 'The book by topic' },
      { href: '/book/topic-start-here.html', code: 'Topic', title: 'The book at a glance', note: 'Where to start in the book, on your own or with others' },
      { href: '/book/topic-share-the-load.html', code: 'Topic', title: 'The book on sharing the load', note: 'Every chapter’s part on sharing the work, plus the tools that go with it' },
      { href: '/book/topic-talk-it-through.html', code: 'Topic', title: 'The book on talking it through', note: 'Every chapter’s part on talking and listening, plus the tools' },
      { href: '/book/topic-know-yourself.html', code: 'Topic', title: 'The book on knowing yourself', note: 'Every chapter’s part about you, plus the self tools and workpapers' },
      { href: '/book/topic-calm.html', code: 'Topic', title: 'The book on staying calm', note: 'Every chapter’s part on settling, plus the calm tools' },
      { sub: 'The book' },
      { sub: 'Part One: The most important, yourself' },
      { href: '/book/self-1-then.html', deep: true, code: 'Then', title: 'Where you came from', note: 'Where your lens came from: growing up, old rules and what life taught you' },
      { href: '/book/self-2-now.html', deep: true, code: 'Now', title: 'Who you are today', note: 'Your wiring, your weather and your words, and what is fair to you' },
      { href: '/book/self-3-next.html', deep: true, code: 'Next', title: 'Who you are becoming', note: 'What matters to you, one small goal, tiny steps and a kind monthly look at yourself' },
      { sub: 'Part Two: Between us' },
      { href: '/book/preface.html', deep: true, code: 'Preface', title: 'The work nobody sees', note: 'The quiet, unseen work of running a shared life' },
      { href: '/book/chapter-1.html', deep: true, code: 'I', title: 'Why we get out of tune', note: 'How pace, tone and urgency nudge two people out of sync' },
      { href: '/book/chapter-2.html', deep: true, code: 'II', title: 'Is the split working?', note: 'Look at the arrangement, never at a person' },
      { href: '/book/chapter-3.html', deep: true, code: 'III', title: 'Full tanks and different angles', note: 'Why some reactions are bigger than their cause' },
      { href: '/book/chapter-4.html', deep: true, code: 'IV', title: 'Two kinds of fair', note: 'Agreeing on what fair means to you both' },
      { href: '/book/chapter-5.html', deep: true, code: 'V', title: 'The monthly look-back', note: 'Catch what weekly check-ins miss' },
      { href: '/quest.html', title: 'Your quest map', note: 'A map that lights up as you read' },
      { sub: 'Read and listen' },
      { href: '/library.html', code: 'Library', title: 'The Professor’s Library', note: 'Psychology and conflict in plain words, with the evidence and its limits' },
      { href: '/learn/index.html', deep: true, code: 'Stories', title: 'Stories from Philosophy', note: 'Old stories with useful ideas inside' },
      { href: '/reading.html', code: 'Articles', title: 'Articles to read', note: 'Hand-picked articles from trusted sources' },
      { href: '/podcast-index.html', code: 'Podcast', title: 'The Podcast', note: 'Kane and Christian talk through the ideas' },
      { sub: 'The big ideas and the words' },
      { href: '/glossary.html', code: 'Words', title: 'Glossary', note: 'Every word the site uses, in plain English' },
      { href: '/frequency-framework.html', deep: true, title: 'The Frequency Framework', note: 'Why two kind people fall out of step, and how to find the rhythm again' },
      { href: '/infographic.html', title: 'The whole idea on one page', note: 'A printable summary, easy to share' },
      { href: '/polymath.html', title: 'The polymath way', note: 'How thirteen fields of study became one program' }
    ]},
    { id: 'play', pick: ['/pause-and-play.html', '/night-garden.html', '/soundscapes.html#brain-breakers', '/frequency-buddies.html', '/frequency-journey.html', '/bears-dojo.html'], name: 'Calm & play', title: 'Calm & play', blurb: 'Calm games, cartoons and sounds for a busy mind. No timers and no way to lose.', items: [
      { href: '/book/topic-calm.html', code: 'Book', title: 'The book on staying calm', note: 'Every chapter’s part on settling, plus the calm tools' },
      { href: '/bears-dojo.html', code: 'New', title: 'The Bears Dojo', note: 'A temple garden to wander, a bear to build, a quiet room of gentle things' },
      { href: '/night-garden.html', code: 'Breathe', title: 'The Night Garden', note: 'Breathe slowly and watch the flowers bloom' },
      { href: '/pause-and-play.html', code: 'All', title: 'Pause & Play', note: 'All the calm games and word puzzles, your level and your garden' },
      { href: '/frequency-journey.html', code: 'Game', title: 'Tidbit and Sugarfoot’s Arcade', note: 'Five gentle classic games: a maze chase, a crossing, a wagon-trail journey, a brick breaker and a catch game' },
      { href: '/calm-visualizer.html', code: 'Drift', title: 'Drift: calm visualizer', note: 'Slow colors and tones matched to how you feel' },
      { href: '/soundscapes.html#brain-breakers', code: 'Music', title: 'Brain Breakers', note: 'Four instrumental pieces from soft to cinematic, with a music visualizer and vibration' },
      { href: '/frequency-buddies.html', code: 'Cartoon', title: 'Frequency Buddies', note: 'A free cartoon about feelings, with captions. Live and shuffle versions are inside' },
      { href: '/frequency-buddies-music-video.html', code: 'New', title: 'The theme song music video', note: 'Everyone on stage, singing and dancing' },
      { href: '/frequency-buddies-music-video-maker.html', code: 'Make', title: 'Make your own music video', note: 'Pick the stage, costumes and moves, then share it' },
      { href: '/frequency-buddies-season-2.html', code: 'Teaser', title: 'Season 2 teaser', note: 'Out now: new places, new friends, and five hidden secrets. Season 2 is coming soon' },
      { href: '/pal-cam-tv.html', code: 'Live', title: 'Pal Cam TV', note: 'The pups live, all day, full screen or on your TV' },
      { href: '/echoes-of-gold.html', code: 'Album', title: 'Echoes of Gold', note: 'The companion album' }
    ]},
    { id: 'about', pick: ['/about.html', '/is-this-for-you.html', '/on-this-device.html', '/legal/privacy-policy.html'], name: 'About', title: 'About', blurb: 'Who made this and why, what this is, and the site’s policies.', items: [
      { href: '/about.html', title: 'About the creator', note: 'Christian’s story, and why this exists' },
      { href: '/is-this-for-you.html', deep: true, title: 'Is this right for you?', note: 'What this is and isn’t, and who it helps' },
      { href: '/how-it-works.html', deep: true, title: 'How it works', note: 'A friendly tour of the idea behind it all' },
      { href: '/five-pillars.html', deep: true, title: 'The Five Pillars', note: 'The five ideas under everything here' },
      { href: '/method-and-limits.html', title: 'Method and limits', note: 'Every score, formula and cut-off, written out' },
      { href: '/ways-in.html', deep: true, title: 'Ways in', note: 'Free while it’s being built: what each level opens' },
      { href: '/membership.html', title: 'Email updates', note: 'Optional: a short note when something new ships' },
      { href: '/on-this-device.html', title: 'What’s stored on this device', note: 'See and erase what this site keeps in your browser' },
      { href: '/contents.html', deep: true, code: 'All', title: 'Every page', note: 'The full contents and site directory, including status pages' },
      { href: '/legal/privacy-policy.html', title: 'Privacy policy' },
      { href: '/legal/terms-of-service.html', title: 'Terms of service' },
      { href: '/legal/refund-policy.html', title: 'Refund policy' }
    ]}
  ];


  // ===== Nothing below needs editing =====
  var STORE_KEY = 'tol-member-email';
  // Full path from the site root, e.g. /book/chapter-2.html ("/" means /index.html)
  var current = decodeURIComponent(location.pathname);
  if (/\/$/.test(current)) current += 'index.html';
  else if (!/\.[a-z0-9]+$/i.test(current)) current += '.html';
  // An in-depth page shares its simple page's menu entry: /book/chapter-2-in-depth.html → /book/chapter-2.html
  var inDepth = /-in-depth\.html$/.test(current);
  if (inDepth) current = current.replace(/-in-depth\.html$/, '.html');
  function deepHref(it) { return it.href.replace(/\.html(?=#|$)/, '-in-depth.html'); }
  // Tender reading pages (growing up, knowing yourself, and any page marked data-sensitive): no pop-ups,
  // no cheering buddies or pup visits, no Professor Puddles cards and no learning-trail score on them.
  var SENSITIVE = /^\/(growing-up|know-yourself)\.html$/;
  function sensitivePage() { return SENSITIVE.test(current) || !!(document.body && document.body.hasAttribute('data-sensitive')); }
  if (SENSITIVE.test(current)) document.documentElement.classList.add('tol-sensitive');
  // Work mode: a plain version to share at work, with no mascots, cartoons, garden or games. A link with
  // ?work=1 turns it on for this tab (it stays on as they click around), ?work=0 turns it off, and pages
  // marked data-work (the "At work" page) always open in it. Nothing is stored beyond this tab.
  // "Keep it on this device" (from the work-mode note) keeps it on in this browser until "Turn it off".
  var WORK = (function () {
    var q = /[?&]work=([01])\b/.exec(location.search);
    try {
      if (q) { if (q[1] === '1') sessionStorage.setItem('tol-work', '1'); else { sessionStorage.removeItem('tol-work'); localStorage.removeItem('tol-work-keep'); } }
      if (/[?&]work=keep\b/.test(location.search)) { localStorage.setItem('tol-work-keep', '1'); sessionStorage.setItem('tol-work', '1'); }
      return sessionStorage.getItem('tol-work') === '1' || localStorage.getItem('tol-work-keep') === '1';
    } catch (e) { return !!(q && q[1] === '1'); }
  })();
  function workKept() { try { return localStorage.getItem('tol-work-keep') === '1'; } catch (e) { return false; } }
  // Serious pages are always plain too, with no pups, cartoons, tips or promos beside them: grief, safety,
  // the honest limits, "is this for you?" and the page for someone who was sent a link.
  var PLAIN = /^\/(grief|safety|method-and-limits|is-this-for-you|sent-this)\.html$/;
  // Working pages (the tools and worksheets) are a calm workspace: no moving garden, pups or drifting bubbles beside a form.
  // The soft colour wash stays. Calm and play pages keep their garden.
  var WORKSPACE = /^\/(lemonade-stand|signal-translator|conversation-reader|carrier-wave-decoder|wiring-card|wavelength|quick-checks|perspective-shifter|chore-chart-for-couples|pursue-withdraw|family-obligations)\.html$|^\/workpapers\/|^\/wp-11(-in-depth)?\.html$|^\/tools\//;
  function workMode() { return WORK || PLAIN.test(current) || !!(document.body && document.body.hasAttribute('data-work')); }
  if (WORK || PLAIN.test(current)) document.documentElement.classList.add('tol-work');
  // when this visit began (this tab only), so no invitation shows in someone's first minute here
  try { if (!sessionStorage.getItem('tol-visit-t0')) sessionStorage.setItem('tol-visit-t0', String(Date.now())); } catch (e) {}

  var here = null, hereSection = null;
  SECTIONS.forEach(function (s) {
    s.items.forEach(function (it) { if (it.href === current) { here = it; hereSection = s; } });
  });
  // Menu entries take their members lock from SECTIONS, so the lock is still set in one place
  var PAID = {};
  SECTIONS.forEach(function (s) { s.items.forEach(function (it) { if (it.paid) PAID[it.href.split('#')[0]] = true; }); });
  var hereGroup = null;
  MENU.forEach(function (g) {
    g.items.forEach(function (it) {
      if (!it.href) return;
      if (PAID[it.href.split('#')[0]]) it.paid = true;
      if (!hereGroup && it.href.split('#')[0] === current) hereGroup = g;
    });
  });

  function el(tag, attrs, html) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'class') n.className = attrs[k]; else n.setAttribute(k, attrs[k]);
    });
    if (html != null) n.innerHTML = html;
    return n;
  }
  function esc(s) { var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
  function label(it) {
    if (!it.code) return it.title;
    var code = /^[IVX]+$/.test(it.code) ? 'Chapter ' + it.code : it.code;
    return code + ': ' + it.title;
  }


  // Each menu group names a few pages (pick) that show first; the rest wait behind "All N pages"
  // in the menus, tools are named by what they do; the tool's own name follows in brackets
  var PLAIN_LABEL = {
    '/signal-translator.html': 'Check a message before you send it',
    '/conversation-reader.html': 'Read a tricky conversation calmly',
    '/lemonade-stand.html': 'Who does what, and who pays what (Lemonade Stand)',
    '/wavelength.html': 'How you talk and listen (Wavelength)',
    '/wiring-card.html': 'A card on how you take in words (Wiring Card)',
    '/carrier-wave-decoder.html': 'When a talk goes sideways (Decoder)',
    '/perspective-shifter.html': 'See it from their side',
    '/soundscapes.html#brain-breakers': 'Calm music (Brain Breakers)',
    '/workpapers/fill/suite.html': 'All the worksheets in one place (Workpaper Suite)'
  };
  function menuLabel(it) { return PLAIN_LABEL[it.href] || it.title; }
  function groupLinks(g) { return g.items.filter(function (i) { return i.href && i.href !== '/index.html' && i.menu !== false; }); }
  function groupPicks(g) {
    var all = groupLinks(g), seen = {}, out = [];
    (g.pick || []).forEach(function (h) { var it = all.filter(function (i) { return i.href === h; })[0]; if (it && !seen[h]) { seen[h] = 1; out.push(it); } });
    if (!out.length) out = all.slice(0, 6);
    var cur = all.filter(function (i) { return i.href.split('#')[0] === current; })[0];
    if (cur && out.indexOf(cur) === -1) out.push(cur);   // the page you're on always shows
    return out;
  }
  function groupCount(g) { var seen = {}; groupLinks(g).forEach(function (i) { seen[i.href] = 1; }); return Object.keys(seen).length; }

  var isMember = false;

  // ---------- Index (panel + home page) ----------
  function buildIndex(opts) {
    var wrap = el('div', { class: 'tol-index' + (opts.page ? ' is-page' : '') + (isMember ? ' is-member' : '') });
    // the menu panel shows the grouped MENU; the Contents page lists every page in SECTIONS
    (opts.accordion ? MENU : SECTIONS).forEach(function (s) {
      if (opts.page && s.id === 'about' && !opts.all) return;
      if (opts.page && s.id === 'new' && opts.all) return; // the contents list names each page once, in its home section
      var sec;
      if (opts.accordion) {
        // The panel shows section names only; open one to see its pages
        sec = el('details', { class: 'tol-index-section tol-acc', id: 'tol-sec-' + s.id });
        if (s.id === opts.open) sec.open = true;
        var hereMark = hereGroup && hereGroup.id === s.id ? ' <span class="tol-acc-here">you are here</span>' : '';
        sec.appendChild(el('summary', null, '<span class="tol-acc-title">' + esc(s.title) + hereMark + '</span>'));
        // One section open at a time keeps the list short
        sec.addEventListener('toggle', function () {
          if (!sec.open) return;
          wrap.querySelectorAll('details.tol-acc[open]').forEach(function (d) { if (d !== sec) d.open = false; });
        });
      } else {
        sec = el('div', { class: 'tol-index-section', id: (opts.page ? 'contents-' : 'tol-sec-') + s.id });
        sec.appendChild(el(opts.h || 'h3', null, esc(s.title)));
      }
      if (opts.accordion && opts.full && s.id === opts.open) {
        // arrived from "All N pages in …": the whole list straight away
        var whole = fullList(s, true); whole.classList.add('tol-picks'); sec.appendChild(whole); wrap.appendChild(sec); return;
      }
      if (opts.accordion) {
        // a few pages first, plain names only; "Show all" opens the full list with its headings and notes
        var short = el('ol', { class: 'tol-picks' });
        groupPicks(s).forEach(function (it) {
          var pa = el('a', { class: 'tol-row', href: it.href }, '<span class="tol-title">' + esc(menuLabel(it)) + '</span>');
          if (it.href.split('#')[0] === current) pa.setAttribute('aria-current', 'page');
          var pli = el('li'); pli.appendChild(pa); short.appendChild(pli);
        });
        var total = groupCount(s), rest = total - short.children.length;
        sec.appendChild(short);
        if (rest > 0) {
          var moreB = el('button', { type: 'button', class: 'tol-more-btn tol-acc-all' }, 'Show all ' + total + ' pages');
          moreB.addEventListener('click', function () {
            var full = fullList(s, true); full.classList.add('tol-picks'); short.replaceWith(full); moreB.remove();
            var fa = full.querySelector('a'); if (fa) fa.focus();
          });
          sec.appendChild(moreB);
        }
        wrap.appendChild(sec);
        return;
      }
      if (s.blurb) sec.appendChild(el('p', null, esc(s.blurb)));
      sec.appendChild(fullList(s));
      wrap.appendChild(sec);
    });
    return wrap;
  }
  function fullList(s, plain) {
      var ol = el('ol');
      s.items.forEach(function (it) {
        if (it.sub) { ol.appendChild(el('li', { class: 'tol-sub', role: 'presentation' }, esc(it.sub))); return; }
        if (it.href === '/index.html' || it.menu === false) return; // menu:false pages are reached from their parent page
        var a = el('a', { class: 'tol-row', href: it.href });
        if (it.href.split('#')[0] === current) a.setAttribute('aria-current', 'page');
        a.innerHTML =
          (plain ? '' : '<span class="tol-code">' + esc(it.code || '') + (it.code ? '<span class="sr-only">: </span>' : '') + '</span>') +
          '<span class="tol-title">' + esc(plain ? menuLabel(it) : it.title) + (it.note ? '<small>' + esc(it.note) + '</small>' : '') + '</span>' +
          '<span class="tol-access">' + (it.paid && !CONFIG.openAll ? (isMember ? 'unlocked' : (CONFIG.freePreview ? 'Free with sign-up' : 'members')) : '') + '</span>';
        var li = el('li', it.foot ? { class: 'tol-foot-row' } : null); li.appendChild(a);
        if (it.deep && !plain) li.appendChild(el('a', { class: 'dig tol-dig', href: deepHref(it) }, 'Dig deeper'));  // the menu stays simple: each page links its own full version
        ol.appendChild(li);
      });
      return ol;
  }

  // ---------- Join / Signed-up link (header bar) ----------
  var memberLinks = [];
  function joinLink(cls) {
    var a = el('a', { class: cls, href: '/membership.html' }, CONFIG.freePreview ? 'Join free' : 'Join');
    memberLinks.push(a);
    return a;
  }

  // ---------- Header bar + panel ----------
  var panel, scrim, lastFocus, memberLink;

  // The sections shown in the top bar. Each opens a short list of its pages.
  var RIBBON = MENU.filter(function (g) { return g.id !== 'about'; }).map(function (g) { return [g.id, g.name || g.title]; });
  var openDrop = null;

  function closeDrop(refocus) {
    if (!openDrop) return;
    openDrop.btn.setAttribute('aria-expanded', 'false');
    openDrop.menu.hidden = true;
    if (refocus) openDrop.btn.focus();
    openDrop = null;
  }

  function buildDrop(id, name, alignRight) {
    var s = MENU.filter(function (x) { return x.id === id; })[0];
    var item = el('div', { class: 'tol-nav-item' });
    var btn = el('button', { type: 'button', 'data-sec': id, 'aria-expanded': 'false', 'aria-controls': 'tol-drop-' + id }, esc(name));
    if (hereGroup && hereGroup.id === id) btn.setAttribute('aria-current', 'true');
    var menu = el('div', { class: 'tol-drop' + (alignRight ? ' is-right' : ''), id: 'tol-drop-' + id, hidden: '' });
    var ul = el('ul');
    groupPicks(s).forEach(function (it) {
      var a = el('a', { href: it.href }, esc(menuLabel(it)));
      if (it.href.split('#')[0] === current) a.setAttribute('aria-current', 'page');
      var li = el('li'); li.appendChild(a); ul.appendChild(li);
    });
    menu.appendChild(ul);
    var n = groupCount(s);
    var all = el('button', { type: 'button', class: 'tol-drop-all', 'aria-controls': 'tol-panel' }, 'All ' + n + ' pages in ' + esc(name) + ' &rarr;');
    all.addEventListener('click', function () { openPanel(id, false, true); });
    menu.appendChild(all);
    btn.addEventListener('click', function () {
      var wasOpen = openDrop && openDrop.btn === btn;
      closeDrop();
      if (wasOpen) return;
      btn.setAttribute('aria-expanded', 'true'); menu.hidden = false;
      openDrop = { btn: btn, menu: menu };
    });
    item.addEventListener('focusout', function (e) {
      if (openDrop && openDrop.btn === btn && !item.contains(e.relatedTarget)) closeDrop();
    });
    item.appendChild(btn); item.appendChild(menu);
    return item;
  }
  document.addEventListener('click', function (e) {
    if (openDrop && !(e.target.closest && e.target.closest('.tol-nav-item'))) closeDrop();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && openDrop) closeDrop(true);
  });

  // "Pick up where you left off" and the time launcher (pick-up.js), loaded when first needed
  var pickUpWait = null;
  function loadPickUp(cb) {
    if (window.TOLPickUp) return cb();
    if (pickUpWait) { pickUpWait.push(cb); return; }
    pickUpWait = [cb];
    var sc = document.createElement('script'); sc.src = '/assets/js/pick-up.js';
    sc.onload = function () { var w = pickUpWait; pickUpWait = null; if (window.TOLPickUp) w.forEach(function (f) { f(); }); };
    document.head.appendChild(sc);
  }
  // the last few pages opened here, for "Pick up where you left off" (this browser only; it can be switched off or erased)
  function rememberPage(body) {
    if (lsGet('tol-recent-off') || /^\/(index|404|offline|garden-backdrop|pal-cam-tv|on-this-device|membership|safety|ask|teens|upset-right-now)\.html$|^\/legal\//.test(current) || location.search.indexOf('palcam-pop') !== -1) return;
    var h1 = document.querySelector('main h1');
    var t = (here && here.title) || (h1 && h1.textContent.replace(/\s+/g, ' ').trim()) || document.title.replace(/\s*[·|–—-]\s*(Spread Love|The Objective Ledger).*$/, '');
    if (!t) return;
    if (inDepth) t += ' (full version)';
    var u = location.pathname, list = [];
    try { list = JSON.parse(lsGet('tol-recent') || '[]') || []; } catch (e) { list = []; }
    list = list.filter(function (r) { return r && r.u !== u; });
    list.unshift({ u: u, t: t.slice(0, 90), at: Date.now() });
    lsSet('tol-recent', JSON.stringify(list.slice(0, 6)));
  }

  function openPanel(sectionId, toSearch, full) {
    lastFocus = document.activeElement;
    var pu = panel.querySelector('[data-pickup="menu"]');
    if (pu && !toSearch) loadPickUp(function () { window.TOLPickUp.mount(pu, 'menu'); });
    closeDrop();
    panel.querySelector('.tol-index').replaceWith(buildIndex({ accordion: true, open: sectionId, full: !!full }));
    if (!toSearch) { var q0 = panel.querySelector('.tol-find input'); if (q0 && q0.value) { q0.value = ''; runSearch(''); } }
    else { var q1 = panel.querySelector('.tol-find input'); if (q1 && q1.value) runSearch(q1.value); }
    scrim.hidden = false; panel.hidden = false;
    setInert(true);
    document.querySelectorAll('[aria-controls="tol-panel"]').forEach(function (b) { b.setAttribute('aria-expanded', 'true'); });
    panel.scrollTop = 0;  // start at the top so every section name is in view
    if (full && sectionId) { var openSec = panel.querySelector('#tol-sec-' + sectionId); if (openSec) openSec.scrollIntoView({ block: 'start' }); }
    if (toSearch) panel.querySelector('.tol-find input').focus({ preventScroll: true });
    else panel.querySelector('.tol-close').focus({ preventScroll: true });
  }
  // While the menu panel is open, everything behind it is out of reach (keyboard, screen readers, taps)
  var inerted = [];
  function setInert(on) {
    if (on) {
      inerted = Array.prototype.filter.call(document.body.children, function (n) {
        return n !== panel && n !== scrim && !n.hasAttribute('inert') && !/^(SCRIPT|STYLE|LINK)$/.test(n.tagName);
      });
      inerted.forEach(function (n) { n.setAttribute('inert', ''); });
    } else { inerted.forEach(function (n) { n.removeAttribute('inert'); }); inerted = []; }
  }
  function closePanel() {
    setInert(false);
    scrim.hidden = true; panel.hidden = true;
    document.querySelectorAll('[aria-controls="tol-panel"]').forEach(function (b) { b.setAttribute('aria-expanded', 'false'); });
    if (lastFocus) lastFocus.focus();
  }

  // A browser set to Spanish gets one quiet line pointing to the Spanish page, once per visit until it's
  // closed (then never again on this device). Nothing is sent anywhere; the choice is kept in this browser.
  function spanishHint(bar) {
    var langs = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || '']);
    if (!/^es\b/i.test(String(langs[0] || '')) || current === '/en-espanol.html' || /^\/(404|offline|pal-cam-tv|garden-backdrop)\.html$/.test(current)) return;
    if (document.body.classList.contains('is-game') || lsGet('tol-es-hint') === 'no') return;
    try { if (sessionStorage.getItem('tol-es-hint-seen') === '1') return; sessionStorage.setItem('tol-es-hint-seen', '1'); } catch (e) {}
    var line = el('p', { class: 'tol-es-hint tol-plain no-bubble', lang: 'es', role: 'note' },
      '<span>¿Prefieres español?</span> <a href="/en-espanol.html" hreflang="es">Ver la página en español →</a>' +
      '<button type="button" aria-label="Cerrar: no volver a mostrar">Cerrar</button>');
    line.querySelector('button').addEventListener('click', function () { lsSet('tol-es-hint', 'no'); line.remove(); });
    line.querySelector('a').addEventListener('click', function () { lsSet('tol-es-hint', 'no'); });
    var m = document.querySelector('main');
    if (m) m.insertBefore(line, m.firstChild); else bar.after(line);
  }
  // a few small styles that belong to parts made here (site.css has the rest)
  function addSiteStyles() {
    if (document.getElementById('tol-site-js-css')) return;
    var st = document.createElement('style'); st.id = 'tol-site-js-css';
    st.textContent =
      // the At work page on its own keeps Calm & play in the menus (only work mode, when chosen, hides it)
      'html.tol-work-page .tol-nav-item:has(> button[data-sec="play"]), html.tol-work-page #tol-sec-play{ display:block !important; }' +
      // "En español": a plain link in the top bar, the same size as the section buttons
      '.tol-bar a.tol-es-link{ font:inherit; font-size:1rem; color:var(--ink); padding:.5rem .7rem; border:1px solid transparent; border-radius:var(--radius, 6px); text-decoration:none; white-space:nowrap; line-height:1.2; }' +
      '.tol-bar a.tol-es-link:hover{ border-color:var(--line); background:var(--paper-deep); text-decoration:underline; text-decoration-color:var(--brass); text-underline-offset:4px; }' +
      '@media (max-width:980px){ .tol-bar a.tol-es-link{ padding:.5rem .5rem; } }' +
      '.tol-panel-es{ margin:.5rem 0 0; font-size:.95rem; }' +
      '.tol-panel-es a{ font-weight:600; }' +
      // the print button beside "Share this guide"
      '.tol-share-row .tol-print-btn{ display:inline-flex; align-items:center; gap:.45rem; min-height:44px; padding:.4rem 1.05rem; box-sizing:border-box; font:600 .95rem/1.2 var(--tol-sans, system-ui, sans-serif); color:#3C3354; background:#FFFDF7; border:1.5px solid #B9A8D6; border-radius:999px; cursor:pointer; }' +
      '.tol-share-row .tol-print-btn:hover{ background:#F3EEF9; }' +
      '.tol-print-btn:focus-visible{ outline:3px solid var(--focus, #2B5B8C); outline-offset:2px; }' +
      // "¿Prefieres español?": one quiet line under the bar
      '.tol-es-hint{ display:flex; flex-wrap:wrap; align-items:center; gap:.3rem .8rem; margin:.4rem auto .6rem; max-width:46rem; padding:.4rem .5rem .4rem .9rem; border:1px solid var(--line, #d8cfb8); border-radius:10px; font-size:.95rem; background:var(--paper, #fffaf0); color:var(--ink, #2a2530); box-sizing:border-box; }' +
      '.tol-es-hint a{ font-weight:600; }' +
      '.tol-es-hint button{ margin-left:auto; font:inherit; font-size:.9rem; color:inherit; background:none; border:1px solid currentColor; border-radius:999px; min-height:36px; min-width:36px; padding:.15rem .7rem; cursor:pointer; }' +
      '@media print{ .tol-es-hint, .tol-print-btn, .tol-panel-es{ display:none !important; } }';
    document.head.appendChild(st);
  }

  function buildChrome() {
    var body = document.body;
    var cs = getComputedStyle(body);
    var pt = parseFloat(cs.paddingTop) || 0, pr = parseFloat(cs.paddingRight) || 0,
        pb = parseFloat(cs.paddingBottom) || 0, pl = parseFloat(cs.paddingLeft) || 0;

    var skip = el('a', { class: 'tol-skip', href: '#tol-main' }, 'Skip to content');
    if (workMode()) document.documentElement.classList.add('tol-work');
    // the "At work" page is plain itself, but that isn't choosing work mode: Calm & play stays in the menu,
    // and the pages it links to keep their usual look. Work mode (?work=1, or "Keep it on") hides them.
    if (!WORK && body.hasAttribute('data-work')) document.documentElement.classList.add('tol-work-page');
    addSiteStyles();

    var bar = el('div', { class: 'tol-bar', role: 'banner' });
    bar.style.margin = (-pt) + 'px ' + (-pr) + 'px ' + pt + 'px ' + (-pl) + 'px';
    bar.appendChild(el('a', { class: 'tol-brand', href: '/index.html' },
      '<img class="tol-logo" src="/assets/img/logo-mark.svg" alt="" width="36" height="36"><span>Spread Love &amp; Acceptance</span>'));

    var nav = el('div', { class: 'tol-sections', role: 'navigation', 'aria-label': 'Site sections' });
    RIBBON.forEach(function (p, n) { nav.appendChild(buildDrop(p[0], p[1], n >= RIBBON.length - 3)); });
    // the Spanish page, in its own words, at the top level (it steps aside first if the bar gets crowded)
    var esLink = el('a', { class: 'tol-es-link', href: '/en-espanol.html', lang: 'es', hreflang: 'es' }, 'En español');
    if (current === '/en-espanol.html') esLink.setAttribute('aria-current', 'page');
    nav.appendChild(esLink);
    bar.appendChild(nav);

    bar.appendChild(quietButton('bar'));
    bar.appendChild(settingsButton('tol-bar-set'));
    var find = el('button', { type: 'button', class: 'tol-search-btn', 'aria-controls': 'tol-panel', 'aria-expanded': 'false' },
      '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M15.5 15.5 21 21" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg><span>Search</span>');
    find.addEventListener('click', function () { openPanel(null, true); });
    bar.appendChild(find);
    var mob = el('button', { type: 'button', class: 'tol-contents-btn', 'aria-controls': 'tol-panel', 'aria-expanded': 'false' }, 'Menu');
    mob.addEventListener('click', function () { openPanel(null); });
    bar.appendChild(mob);
    memberLink = joinLink('tol-member');
    bar.appendChild(memberLink);

    scrim = el('div', { class: 'tol-scrim', hidden: '' });
    scrim.addEventListener('click', closePanel);
    panel = el('div', { class: 'tol-panel', id: 'tol-panel', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Menu', hidden: '' });
    var head = el('div', { class: 'tol-panel-head' });
    head.appendChild(el('h2', null, 'Menu'));
    var close = el('button', { type: 'button', class: 'tol-close' }, 'Close');
    close.addEventListener('click', closePanel);
    head.appendChild(close);
    panel.appendChild(head);
    panel.appendChild(buildSearch());
    panel.appendChild(el('p', { class: 'tol-panel-safe' }, '<a href="/safety.html">Not safe at home?</a> <button type="button" data-tol-exit>Leave this site quickly</button>'));
    panel.appendChild(el('p', { class: 'tol-panel-es', lang: 'es' }, '<a href="/en-espanol.html" hreflang="es">En español</a>: pasos cortos, en tu idioma'));
    panel.appendChild(buildIndex({ accordion: true }));
    // after the sections: where you left off, then settings in one button (Quiet mode, dark mode and the rest live there)
    panel.appendChild(el('div', { class: 'tol-panel-pickup', 'data-pickup': 'menu' }));
    var tools = el('div', { class: 'tol-panel-tools' });
    tools.appendChild(settingsButton('tol-panel-set', 'Settings: text size, Quiet mode, dark mode'));
    tools.appendChild(joinLink('tol-member tol-panel-join'));
    panel.appendChild(tools);

    document.addEventListener('keydown', function (e) {
      if (panel.hidden) return;
      if (e.key === 'Escape') closePanel();
      if (e.key === 'Tab') {
        var f = Array.prototype.filter.call(panel.querySelectorAll('a[href], button:not([disabled]), summary, input:not([disabled]), select, textarea'), function (n) { return n.getClientRects().length > 0 && !n.closest('details:not([open]) > :not(summary)'); });
        if (!f.length) return;
        if (!panel.contains(document.activeElement)) { e.preventDefault(); (e.shiftKey ? f[f.length - 1] : f[0]).focus(); return; }
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });

    // Simple pages get their cute dressing and a gentle reminder (see site.css)
    if (hereSection) body.setAttribute('data-sec', hereSection.id);
    if (current === '/index.html') document.documentElement.classList.add('tol-home');
    // pages with their own dark look (the games, the Night Garden, Drift) keep it as it is
    if (body.classList.contains('is-game') || body.hasAttribute('data-no-dark') || /^\/(night-garden|calm-visualizer|pal-cam-tv|garden-backdrop)\.html$/.test(current)) document.documentElement.classList.add('tol-nodark');
    // every piece of reading text in its own soft bubble (site.css "Text bubbles"), except on pages with their own full-screen look
    if (!document.documentElement.classList.contains('tol-nodark') && !/^\/(404|offline)\.html$/.test(current)) {
      document.documentElement.classList.add('tol-bubbles');
      // a bubble that is only as wide as its words stays in the middle when its text is centred
      var midBubbles = function () {
        document.querySelectorAll('main :is(p, dt, dd, figcaption, address, li, h1, h2, h3, h4, h5, h6):not(.tol-bub-mid)').forEach(function (n) {
          var ta = getComputedStyle(n).textAlign, pd = n.parentElement && getComputedStyle(n.parentElement).display;
          if (/center/.test(ta) && /^(block|flow-root|list-item|table-cell)$/.test(pd)) n.classList.add('tol-bub-mid');
        });
      };
      midBubbles(); setTimeout(midBubbles, 1500);
    }
    var ideas = document.querySelector('main .ideas');
    if (inDepth) body.classList.add('tol-deep');
    if (ideas) body.classList.add('tol-simple');
    buildDepthPicker(!!inDepth);
    // Simple pages use plain names only: the technical name under the title is kept for the Full version
    if (!inDepth && document.querySelector('main .tol-depth')) {
      Array.prototype.forEach.call(document.querySelectorAll('main .read-code .formal'), function (f) {
        var prev = f.previousSibling;
        if (prev && prev.nodeType === 3) prev.textContent = prev.textContent.replace(/\s*(·|&middot;|\u00b7)\s*$/, '');
        f.remove();
      });
    }

    // wide tables scroll inside their own box on small screens, instead of pushing the page sideways
    Array.prototype.forEach.call(document.querySelectorAll('main table'), function (tb) {
      if (tb.parentNode.classList && tb.parentNode.classList.contains('tol-table-scroll')) return;
      var wrap = el('div', { class: 'tol-table-scroll' }); tb.parentNode.insertBefore(wrap, tb); wrap.appendChild(tb);
    });
    addPrivateNote(body);
    addTip(body);
    placeShare(body);
    // Kip stays away from careful reading: not with Easy reading, larger text, a still page, hidden helpers or on the working pages
    var kipOk = !helpersHidden() && !WORKSPACE.test(current) && !/\btol-(easy|still|text-(lg|xl|xxl))\b/.test(document.documentElement.className);
    if (kipOk && (document.querySelector('.tol-share-btn, [data-share]') || current === '/frequency-buddies-season-2.html')) loadScript('/assets/js/share-clip.js').catch(function () {}); // Kip the Paperclip, by the Share buttons
    revealOnScroll();

    // The Night Garden, softly alive behind every page, under a see-through veil.
    // Not on the garden itself, not on the locked-down workpaper pages, and not when
    // someone has asked their device to save data.
    var saveData = navigator.connection && navigator.connection.saveData;
    var gardenParts = null;
    // The garden is on by default, on phones too. It stays away only when the device asks for reduced motion
    // or the visitor chose "Keep the page still" / Quiet mode here (a phone's small screen alone no longer hides it).
    function gardenOk() {
      var mm = window.matchMedia;
      if (mm && mm('(prefers-reduced-motion: reduce)').matches && lsGet(STILL_KEY) !== '0') return false;
      return lsGet(STILL_KEY) !== '1' && !workMode() && !WORKSPACE.test(current);
    }
    function makeGarden() {
      if (gardenParts || !gardenOk()) return;
      // each part of the site has its own scene, lit by the visitor's clock; the games stay in the Night Garden
      var SCENES = { start: 'garden', about: 'garden', self: 'beach', media: 'beach', relationships: 'lake', book: 'meadow', workpapers: 'river', program: 'forest', tools: 'forest' };
      var secId = (current === '/relationships.html' && 'relationships') || (hereSection && hereSection.id) || (/^\/book\//.test(current) ? 'book' : /^\/workpapers\//.test(current) ? 'workpapers' : /^\/(learn|legal)\//.test(current) ? 'about' : ''), sceneQ = secId === 'play' || body.classList.contains('is-game') ? '?scene=garden&tod=night' : '?scene=' + (SCENES[secId] || 'garden');
      if (body.hasAttribute('data-garden-nopals')) sceneQ += (sceneQ ? '&' : '?') + 'pals=off'; // the page has its own pals running about
      var gf = el('iframe', { class: 'tol-garden-bg', src: '/garden-backdrop.html' + sceneQ, title: 'The Night Garden, softly in the background', 'aria-hidden': 'true', tabindex: '-1' });
      var veil = el('div', { class: 'tol-garden-veil', 'aria-hidden': 'true' });
      body.insertBefore(veil, body.firstChild);
      body.insertBefore(gf, body.firstChild);
      document.documentElement.classList.add('has-garden');
      gardenParts = [gf, veil];
    }
    if (!body.hasAttribute('data-no-garden') && current !== '/night-garden.html' && current !== '/garden-backdrop.html' && !saveData &&
        !document.querySelector('meta[http-equiv="Content-Security-Policy"]')) {
      makeGarden();
      // "Keep the page still" takes the garden away entirely (nothing keeps moving out of sight), and brings it back
      stillHooks.push(function (on) {
        if (on && !gardenOk() && gardenParts) { gardenParts.forEach(function (n) { n.remove(); }); gardenParts = null; document.documentElement.classList.remove('has-garden'); }
        else if (!on) makeGarden();
      });
    }

    // levels for calm moments anywhere on the site (rewards.js), except the locked-down workpaper pages
    if (!window.TOLRewards && !workMode() && !document.querySelector('meta[http-equiv="Content-Security-Policy"]')) {
      var rw = document.createElement('script'); rw.src = '/assets/js/rewards.js'; document.head.appendChild(rw);
    }

    // mini dives: tap a term with the little water drop for a short explanation (dives.js)
    if (!body.hasAttribute('data-no-dives') && document.querySelector('main')) {
      var dg = document.createElement('script'); dg.src = '/assets/js/dives-glossary.js';
      dg.onload = function () { var dv = document.createElement('script'); dv.src = '/assets/js/dives.js'; document.head.appendChild(dv); };
      document.head.appendChild(dg);
    }

    // little buddies who cheer you on between the sections of a reading page (cheer.js)
    if (!body.hasAttribute('data-no-cheer') && !helpersHidden() && !busyPage() && !sensitivePage() && current !== '/index.html' && current !== '/' &&
        (document.querySelector('main.read') || body.classList.contains('tol-deep')) && !document.querySelector('meta[http-equiv="Content-Security-Policy"]')) {
      var cw = document.createElement('script'); cw.src = '/assets/js/cheer-words.js';
      cw.onload = cw.onerror = function () { var ch = document.createElement('script'); ch.src = '/assets/js/cheer.js'; document.head.appendChild(ch); };
      document.head.appendChild(cw);
    }

    var lmain = document.querySelector('main');
    // "In short" bullets on the long pages, and "Show me only the steps" (in-short.js)
    if (lmain && !busyPage() && current !== '/index.html' && !document.querySelector('meta[http-equiv="Content-Security-Policy"]') &&
        (inDepth || /^\/library/.test(current) || (lmain.textContent || '').split(/\s+/).length > 400) && !/^\/workpapers\//.test(current)) {
      var isc = document.createElement('script'); isc.src = '/assets/js/in-short.js'; document.head.appendChild(isc);
    }

    // playful learning layer: "Check yourself" moments, a learning trail and the quest map (learn-play.js)
    if (!body.hasAttribute('data-no-learnplay') && !workMode() && !document.querySelector('meta[http-equiv="Content-Security-Policy"]')) {
      var lp = document.createElement('script'); lp.src = '/assets/js/learn-play.js'; document.head.appendChild(lp);
    }

    // "Watch it with the pups": the one Frequency Buddies episode that fits this reading page (buddies-suggest.js).
    // It reads the page's pillar, so it loads after pillars.js. Not on the games, the episodes page itself,
    // the tools, the legal, account and sign-in pages, or the tender pages.
    var buddiesOk = document.querySelector('main') && (document.querySelector('main.read') || inDepth) && !body.hasAttribute('data-no-buddies') &&
      !helpersHidden() && !busyPage() && !sensitivePage() && !(hereSection && hereSection.id === 'play') &&
      !document.querySelector('meta[http-equiv="Content-Security-Policy"]') &&
      !/^\/(index|frequency-buddies|404|offline|ask|brand|contents|reading|library|whats-new|roadmap|telemetry|membership|on-this-device|privacy-policy|refund-policy|terms-of-service|sent-this|about|suite-index)\.html$|^\/(legal|workpapers\/fill|store|supabase)\//.test(current);
    function loadBuddies() {
      if (!buddiesOk || window.TOLBuddiesSuggest) return;
      var bs = document.createElement('script'); bs.src = '/assets/js/buddies-suggest.js'; document.head.appendChild(bs);
    }
    // which of the Five Pillars this page puts to work, as a small strip under the title (pillars.js)
    if (!body.hasAttribute('data-no-pillars') && current !== '/index.html' && !document.querySelector('meta[http-equiv="Content-Security-Policy"]')) {
      var pj = document.createElement('script'); pj.src = '/assets/js/pillars.js';
      pj.onload = pj.onerror = loadBuddies;
      document.head.appendChild(pj);
    } else loadBuddies();

    // Tidbit & Sugarfoot pop by now and then with a tip or a little love (pup-visits.js; the pups and their words load only when a visit is about to happen)
    // (not on the tender pages, and not on Frequency Buddies, where they'd sit over the episode)
    if (document.querySelector('main.read') && !helpersHidden() && !busyPage() && !sensitivePage() && !body.hasAttribute('data-no-pupvisits') && !WORKSPACE.test(current) && !body.classList.contains('is-game') && !document.querySelector('meta[http-equiv="Content-Security-Policy"]') &&
        !/^\/(frequency-journey(-play)?|frequency-buddies|calm-visualizer|ask|404|offline|privacy-policy|refund-policy|terms-of-service)\.html$|^\/(legal|workpapers\/fill)\//.test(current)) {
      var pv = document.createElement('script'); pv.src = '/assets/js/pup-visits.js'; document.head.appendChild(pv);
    }

    // "Put it all together": a short pointer to the full path package and report on the self, relationship,
    // workpaper and program pages, just above the end of the reading
    var fpMain = document.querySelector('main.read');
    if (fpMain && hereSection && /^(self|relationships|workpapers|program|book)$/.test(hereSection.id) && !/^\/(full-path|self-path)\.html$|^\/workpapers\/fill\//.test(current) && !document.querySelector('meta[http-equiv="Content-Security-Policy"]')) {
      var solo = hereSection.id === 'self';
      var fpBox = el('aside', { class: 'tol-fp-note', 'aria-label': 'The full path package' },
        '<p class="tol-fp-k">Put it all together</p>' +
        '<p>' + (solo
          ? 'The <strong>Individual</strong> full path package puts every workpaper for the self path into one fillable PDF, then turns your answers into a report just for you: what’s filling your battery, patterns worth noticing, and kind next steps.'
          : 'The <strong>full path package</strong> puts every workpaper for your relationship into one fillable PDF, for you alone or 2 to 8 people, then turns your answers into a detailed report: findings, things worth a second look, recommendations and a plan.') + '</p>' +
        '<p><a href="' + (solo ? '/self-path.html#package' : '/full-path.html') + '">See how it works</a> · <a href="/workpapers/fill/suite.html' + (solo ? '?road=self' : '') + '#full-path">Open the package</a></p>');
      fpMain.appendChild(fpBox);
    }

    // "Come back gently": a weekly reminder in the visitor's own calendar, wherever a page asks for one (remind.js)
    // "Listen to this page": read aloud by the device's own voice (listen.js) on reading pages; it hides itself without a voice
    if (document.querySelector('main.read') && !body.classList.contains('is-game') && !body.hasAttribute('data-no-listen') && 'speechSynthesis' in window &&
        current !== '/index.html' && !document.querySelector('meta[http-equiv="Content-Security-Policy"]')) {
      var lsn = document.createElement('script'); lsn.src = '/assets/js/listen.js';
      lsn.onload = function () { if (window.TOLListen && window.TOLListen.mount) window.TOLListen.mount({}); };
      document.head.appendChild(lsn);
    }
    if (document.querySelector('.bt-switch')) { var btj = document.createElement('script'); btj.src = '/assets/js/book-topic.js'; document.head.appendChild(btj); }
    if (document.querySelector('[data-tol-remind]')) { var rmj = document.createElement('script'); rmj.src = '/assets/js/remind.js'; document.head.appendChild(rmj); }

    // "Something to read": one hand-picked article that fits this reading page, near the end (reading-suggest.js)
    var readMain = document.querySelector('main.read');
    if (readMain && !body.hasAttribute('data-no-reading') && !document.querySelector('meta[http-equiv="Content-Security-Policy"]') && !/^\/(index|reading|library|whats-new|contents|contents-in-depth|roadmap|telemetry|404|offline|safety|groups|frequency-buddies[a-z0-9-]*|pal-cam-tv|frequency-journey(-play)?|bears-dojo|pause-and-play)\.html$|^\/legal\//.test(current)) {   // kids' pages and the safety page get no grown-up articles
      var rl = document.createElement('script'); rl.src = '/assets/js/reading-list.js';
      rl.onload = function () {
        var rs = document.createElement('script'); rs.src = '/assets/js/reading-suggest.js';
        rs.onload = function () {
          if (!window.TOLReading) return;
          var host = el('div', { class: 'tol-read-host' });
          readMain.appendChild(host);
          try { if (!window.TOLReading.mount(host, { heading: 'none' })) host.remove(); } catch (e) { host.remove(); }
        };
        document.head.appendChild(rs);
      };
      document.head.appendChild(rl);
    }

    popBubbles();

    // "Breathe": a one-minute calm break on every page (the Night Garden has its own)
    if (!body.hasAttribute('data-no-breathe')) buildBreathe(body);
    buildPuddles(body);
    buildPuddlesCards(body);
    buildPuddlesPop(body);
    comfortOffer(body);
    rememberPage(body);
    if (!document.querySelector('meta[http-equiv="Content-Security-Policy"]')) { var cbk = document.createElement('script'); cbk.src = '/assets/js/come-back.js'; document.head.appendChild(cbk); } // time picker, "What you got from this" (come-back.js)
    if (current === '/index.html') {
      var hi = document.querySelector('main [data-home-intro]');
      // right under the opening block, so a returning visitor sees "Welcome back" and their next step on the first screens
      // (inside the opening block, under the first lines, so it's on the first screen; removed again if there's nothing to show)
      if (hi) loadPickUp(function () {
        var h = el('div', { class: 'tol-pickup-host', 'data-pickup': 'home' }), lede = hi.querySelector('.hh-lede');
        if (lede) lede.after(h); else hi.after(h);
        window.TOLPickUp.mount(h, 'home');
        if (!h.querySelector('.tol-pickup')) h.remove();
      });
    }
    palCamHooks(body); // pal cam: "Check in on Tidbit & Sugarfoot" from anywhere (see below)

    // Pastel watercolour splashes behind the page (decorative; see site.css)
    if (!body.hasAttribute('data-no-wash')) {
      // plus a few pastel bubbles and hearts drifting slowly upward
      var floaters = '';
      for (var f = 0; f < (WORKSPACE.test(current) ? 0 : 34); f++) floaters += '<b class="' + (f % 3 === 1 ? 'tol-heart' : 'tol-bub') + '"></b>';
      var wash = el('div', { class: 'tol-wash', 'aria-hidden': 'true' }, '<i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i>' + floaters);
      document.documentElement.appendChild(wash);
    }

    var anchor = el('span', { id: 'tol-main', tabindex: '-1' });
    body.insertBefore(anchor, body.firstChild);
    body.insertBefore(bar, body.firstChild);
    body.insertBefore(skip, body.firstChild);
    // work mode from a link: one quiet line under the bar says so, with a way out
    if (WORK) {
      var wk = el('p', { class: 'tol-work-note', role: 'note' }, 'Work mode: the plain version, with no cartoons or games. ' +
        (workKept() ? 'It stays on in this browser. ' : '<a href="' + location.pathname + '?work=keep">Keep it on on this device</a> · ') +
        '<a href="' + location.pathname + '?work=0">Turn it off</a>');
      var wm = document.querySelector('main');
      if (wm) wm.insertBefore(wk, wm.firstChild); else bar.after(wk);
    }
    spanishHint(bar);
    if (document.querySelector('aside.sidebar')) document.documentElement.classList.add('tol-own-side');
    // Big text or zoom: nothing in the bar is ever pushed off the side. Step by step, the section
    // buttons fold into Menu, then Join moves into the menu panel, then the name wraps onto two lines.
    function fitBar() {
      var html = document.documentElement;
      // the size words really show at: the root size, times the page zoom the Text size setting adds
      var zoomed = parseFloat(getComputedStyle(document.body).zoom) || 1;
      html.classList.toggle('tol-bigtext', parseFloat(getComputedStyle(html).fontSize) * zoomed >= 20);
      bar.classList.remove('is-narrow', 'is-tight', 'is-snug', 'is-tighter', 'is-tightest');
      var name = bar.querySelector('.tol-brand span'), brand = bar.querySelector('.tol-brand'), logo = bar.querySelector('.tol-logo');
      function crowded() {
        var named = name && !bar.classList.contains('is-tighter'); // once the name is tucked away it can't be squeezed
        if (bar.scrollWidth > bar.clientWidth + 1 || (named && name.scrollWidth > name.clientWidth + 1)) return true;
        // the logo squeezed under the next button (big text on a phone) counts too
        if (logo) {
          var lr = logo.getBoundingClientRect().right, nx = brand && brand.nextElementSibling;
          while (nx && !nx.getClientRects().length) nx = nx.nextElementSibling;
          if (nx && lr > nx.getBoundingClientRect().left + 1) return true;
        }
        // the name squeezed into more than two lines (big text on a phone) also counts as crowded
        return !!(named && name.offsetHeight > (parseFloat(getComputedStyle(name).fontSize) || 16) * 2.8);
      }
      // is-snug: Search folds into Menu (the menu panel opens with its own search box), so Settings keeps its word
      // is-tightest (only on the very smallest screens at the biggest text): Settings shows just its picture
      var es = bar.querySelector('.tol-es-link');
      if (es) { es.hidden = false; if (crowded()) es.hidden = true; }   // the Spanish link steps aside before the sections fold away
      ['is-narrow', 'is-tight', 'is-snug', 'is-tighter', 'is-tightest'].forEach(function (c) { if (crowded()) bar.classList.add(c); });
      if (bar.classList.contains('is-snug')) mob.setAttribute('aria-label', 'Menu and search'); else mob.removeAttribute('aria-label');
    }
    function barHeight() { fitBar(); document.documentElement.style.setProperty('--tol-bar-h', bar.offsetHeight + 'px'); }
    barHeightHook = barHeight;
    barHeight(); window.addEventListener('resize', barHeight);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(barHeight);
    // When the bar takes a big share of a short screen (a phone on its side, zoom, large text), it tucks
    // away as you scroll down and comes straight back when you scroll up or move focus into it.
    var lastY = window.scrollY;
    window.addEventListener('scroll', function () {
      var y = window.scrollY, h = bar.offsetHeight, big = h > window.innerHeight * 0.1;
      if (big && y > lastY + 6 && y > h * 2 && !bar.contains(document.activeElement) && !openDrop && panel.hidden) bar.classList.add('is-tucked');
      else if (!big || y < lastY - 6 || y < h) bar.classList.remove('is-tucked');
      lastY = y;
    }, { passive: true });
    bar.addEventListener('focusin', function () { bar.classList.remove('is-tucked'); });
    body.appendChild(scrim);
    body.appendChild(panel);

    // Pager: previous / next within the same section
    if (here && hereSection && ['book', 'workpapers', 'program'].indexOf(hereSection.id) !== -1) {
      var list = hereSection.items.filter(function (i) { return i.href !== '/index.html' && i.menu !== false && (hereSection.id !== 'book' || isChapter(i)); });
      var idx = list.indexOf(here);
      var prev = list[idx - 1], next = list[idx + 1];
      if (prev || next) {
        var pager = el('div', { class: 'tol-pager', role: 'navigation', 'aria-label': 'Previous and next' });
        if (pl || pr) { pager.style.marginLeft = (-pl) + 'px'; pager.style.marginRight = (-pr) + 'px'; pager.style.maxWidth = 'none'; }
        // Reading in depth? Stay in depth where the next page has a full version too.
        var pagerHref = function (it) { return inDepth && it.deep ? deepHref(it) : it.href; };
        if (prev) pager.appendChild(el('a', { href: pagerHref(prev), class: 'is-prev' },
          '<span class="tol-pager-dir">Previous</span><span class="tol-pager-title">' + esc(label(prev)) + '</span>'));
        if (next) pager.appendChild(el('a', { href: pagerHref(next), class: 'is-next' },
          '<span class="tol-pager-dir">Next</span><span class="tol-pager-title">' + esc(label(next)) + '</span>'));
        body.insertBefore(pager, scrim);
      }
    }

    buildChapterBar();

    var foot = el('div', { class: 'tol-foot', role: 'contentinfo' });
    foot.style.margin = '2rem ' + (-pr) + 'px ' + (-pb) + 'px ' + (-pl) + 'px';
    // The privacy promise, on every page except the dashboard (which saves entries by design)
    var promise = current === '/dashboard.html' ? '' :
      '<p class="tol-promise">What you type into the tools and worksheets stays on your device. It is never collected or sent to us. <a href="/legal/privacy-policy.html#your-entries">How we handle your information</a></p>';
    foot.innerHTML = promise +
      '<span class="tol-foot-brand"><img src="/assets/img/logo-mark.svg" alt="" width="40" height="40">Spread Love &amp; Acceptance &middot; spreadloveandacceptance.com</span>' +
 (current === '/polymath.html' ? '' : '<p class="tol-foot-polymath">Every part of this program grows from the same few roots, seen across thirteen fields. <a href="/polymath.html">The polymath way &rarr;</a></p>') +
      '<nav class="tol-foot-guides" aria-label="Guides">' +
        '<a href="/invisible-labor-mental-load.html">The mental load</a>' +
        '<a href="/chore-chart-for-couples.html">Chore chart for couples</a>' +
        '<a href="/how-to-stop-fighting-with-your-partner.html">How to stop fighting</a>' +
        '<a href="/neurodivergent-relationships.html">Neurodivergent relationships</a>' +
        '<a href="/communication-style-quiz.html">Communication style quiz</a>' +
        '<a href="/frequency-buddies.html" data-work-hide>Kids’ cartoon</a>' +
      '</nav>' +
      '<span class="tol-foot-links">' +
        '<a href="/safety.html">Not safe at home?</a>' +
        '<a href="/contents.html">All pages</a>' +
        '<a href="/membership.html">' + (CONFIG.openAll ? 'Email updates' : 'Membership') + '</a>' +
        '<a href="/roadmap.html">Roadmap</a>' +
        '<a href="/legal/privacy-policy.html">Privacy</a>' +
        '<a href="/on-this-device.html">Stored on this device</a>' +
        '<a href="/legal/terms-of-service.html">Terms</a>' +
        '<a href="mailto:' + CONFIG.supportEmail + '">Contact</a>' +
        (isApp() ? '' : '<button type="button" class="tol-install-link">Add to your home screen</button>') +
      '</span>';
    foot.querySelector('.tol-foot-links').appendChild(quietButton('switch'));
    foot.querySelector('.tol-foot-links').appendChild(stillButton());
    foot.querySelector('.tol-foot-links').appendChild(darkButton());
    foot.querySelector('.tol-foot-links').appendChild(settingsButton('tol-foot-set'));
    body.insertBefore(foot, scrim);
    var il = foot.querySelector('.tol-install-link');
    if (il) il.addEventListener('click', showInstall);
    maybeInviteInstall();
  }

  // ---------- Search the site ----------
  // Page titles, headings and text, searched right here in the browser from a small index
  // (assets/js/search-index.js, built by tools/search/build_index.py). Nothing typed leaves the device.
  // It forgives spelling (a letter or two off, swapped letters, words that sound alike, and common
  // slips like "chors" or "wether"), says "Did you mean…", puts the tools first for doing and feeling
  // words ("fight", "chores", "breathe"), and offers the Breathe break and Settings as results too.
  var searchData = null, searchWait = null, vocab = null;
  function loadSearch(cb) {
    if (searchData) return cb(searchData);
    if (searchWait) { searchWait.push(cb); return; }
    searchWait = [cb];
    var sc = document.createElement('script'); sc.src = '/assets/js/search-index.js';
    // each waiting search runs on its own, so one that fails can't stop the ones typed after it
    function each(w, d) { w.forEach(function (f) { try { f(d); } catch (err) { if (window.console) console.warn('search:', err); } }); }
    sc.onload = function () {
      var list = (window.TOL_SEARCH && window.TOL_SEARCH.pages) || [];
      try { prepSearch(list); searchData = list; } catch (err) { searchData = null; }
      var w = searchWait; searchWait = null; each(w, searchData);
    };
    sc.onerror = function () { var w = searchWait; searchWait = null; searchData = null; sc.remove(); each(w, null); };
    document.head.appendChild(sc);
  }
  function fold(t) { return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’‘]/g, "'"); }
  function reEsc(t) { return t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  var STOP = { the: 1, and: 1, for: 1, with: 1, how: 1, what: 1, can: 1, you: 1, your: 1, are: 1, was: 1, when: 1, why: 1, who: 1, does: 1, just: 1, had: 1, have: 1, into: 1, from: 1, this: 1, that: 1, about: 1, get: 1, its: 1, too: 1, very: 1, some: 1, any: 1, all: 1, our: 1, out: 1, but: 1, not: 1, him: 1, her: 1, she: 1, they: 1, them: 1, his: 1, one: 1, did: 1, i: 1, me: 1, my: 1, to: 1, of: 1, in: 1, on: 1, at: 1, is: 1, it: 1, an: 1, a: 1, do: 1, be: 1, or: 1, so: 1, we: 1, us: 1, am: 1, im: 1,
    he: 1, hes: 1, shes: 1, has: 1, been: 1, would: 1, could: 1, should: 1, there: 1, their: 1, theyre: 1, ive: 1, if: 1, as: 1, by: 1, than: 1, then: 1, were: 1, really: 1 };
  var JOIN_RE = null;
  function searchTerms(q) {
    var f = fold(q).replace(/\s+·\s+spread love.*$/, '').replace(/[¿?¡!.,;:()"“”]+/g, ' ').trim();
    // one word on its own that means something else in a longer sentence ("will" as in a will, "my partners")
    if (/^(a |the )?will$/.test(f)) f = 'inheritance';
    if (/^(my |our )?partners$/.test(f)) f = 'polyamory';
    if (!JOIN_RE) JOIN_RE = Object.keys(JOIN).map(function (k) { return [new RegExp('\\b' + reEsc(k).replace(/ /g, '\\s+') + '\\b', 'g'), JOIN[k]]; });
    JOIN_RE.forEach(function (r) { f = f.replace(r[0], r[1]); });
    var all = f.split(/[^a-z0-9'+-]+/).map(function (t) { return t.replace(/^['+-]+|['-]+$/g, '').replace(/'s$/, ''); }).filter(function (t) { return t.length > 1 || /\d/.test(t); });
    var kept = all.filter(function (t) { return !STOP[t.replace(/'/g, '')]; });
    return kept.length ? kept : all;
  }
  // common slips, fixed straight away
  var SLIPS = { chors: 'chores', chorse: 'chores', choirs: 'chores', unbiled: 'unbilled', unbilld: 'unbilled', wether: 'weather', wheather: 'weather',
    crosword: 'crossword', crossward: 'crossword', tierd: 'tired', tird: 'tired', slep: 'sleep', sleap: 'sleep', fihgt: 'fight', figth: 'fight', fite: 'fight',
    gardn: 'garden', gardin: 'garden', profesor: 'professor', proffesor: 'professor', clam: 'calm', calme: 'calm', anxity: 'anxiety', anxeity: 'anxiety', anxios: 'anxious',
    burnot: 'burnout', burnout: 'burnout', brethe: 'breathe', breath: 'breathe', breth: 'breathe', relashionship: 'relationship', relationshp: 'relationship',
    arguement: 'argument', argueing: 'arguing', freqency: 'frequency', frequncy: 'frequency', glosary: 'glossary', dyslexic: 'dyslexia', dislexia: 'dyslexia', dyslexsia: 'dyslexia',
    austism: 'autism', autisim: 'autism', adhd: 'adhd', lemonaid: 'lemonade', parnter: 'partner', patner: 'partner', stresed: 'stressed', overwelmed: 'overwhelmed', overwhelmd: 'overwhelmed',
    batery: 'battery', batterie: 'battery', puddels: 'puddles', translater: 'translator', decodor: 'decoder', wieght: 'weight', seperate: 'separate', definately: 'definitely',
    // slips people told us about: the nearest word on the site isn't the one they meant
    devorce: 'divorce', divorse: 'divorce', devorse: 'divorce', divoce: 'divorce', diverce: 'divorce', divorced: 'divorce', seperated: 'separated', seperation: 'separation',
    sory: 'sorry', sorrie: 'sorry', sorry: 'sorry', appology: 'apology', apolgy: 'apology', apologise: 'apologize', appologize: 'apologize', apologyze: 'apologize',
    pupppy: 'puppy', puppey: 'puppy', puppie: 'puppy', puppies: 'puppy', pupy: 'puppy', doggy: 'dog', doggie: 'dog', dogs: 'dog', tidbitt: 'tidbit', sugerfoot: 'sugarfoot', sugarfut: 'sugarfoot',
    screenshots: 'screenshot', screensot: 'screenshot', screnshot: 'screenshot', sreenshot: 'screenshot', childhod: 'childhood', chilhood: 'childhood', childood: 'childhood',
    forgetfull: 'forgetful', forgot: 'forgot', rember: 'remember', remeber: 'remember', focuss: 'focus', foccus: 'focus', concentrait: 'concentrate', meltdowns: 'meltdown', meltown: 'meltdown' };
  // two words people often split that the site writes as one ("screen shot" → screenshot)
  var JOIN = { 'screen shot': 'screenshot', 'screen shots': 'screenshot', 'melt down': 'meltdown', 'shut down': 'shutdown', 'grown up': 'grown-up', 'grew up': 'growing up', 'brought up': 'growing up', 'pet name': 'petname', 'pet names': 'petname', 'inside joke': 'joke', 'inside jokes': 'joke', 'code word': 'codeword', 'code words': 'codeword', 'safe word': 'codeword', 'taken for granted': 'granted', 'take for granted': 'granted', 'taking for granted': 'granted', 'for granted': 'granted', 'gone stale': 'stale', 'in a rut': 'rut', 'on autopilot': 'autopilot', 'sent me this': 'sentthis', 'sent me a link': 'sentthis', 'sent me': 'sentthis', 'sent this': 'sentthis', 'works full time': 'fulltime', 'work full time': 'fulltime', 'working full time': 'fulltime', 'full time': 'fulltime', 'full-time': 'fulltime', 'paid work': 'fulltime', 'night feeds': 'nightfeeds', 'checks my phone': 'controlsafe', 'adhd and autistic': 'ndcouple', 'autistic and adhd': 'ndcouple', 'adhd girlfriend': 'ndcouple', 'adhd boyfriend': 'ndcouple', 'autistic girlfriend': 'ndcouple', 'autistic boyfriend': 'ndcouple', 'autistic partner': 'ndcouple', 'adhd partner': 'ndcouple', 'neurodivergent couple': 'ndcouple', 'neurodivergent relationship': 'ndcouple', 'rent late': 'rentlate', 'late rent': 'rentlate', 'rent is late': 'rentlate', 'rent being late': 'rentlate', 'pays rent late': 'rentlate', 'loo roll': 'rentlate', 'toilet roll': 'rentlate', 'caring for my dad': 'eldercare', 'caring for my mum': 'eldercare', 'caring for my mom': 'eldercare', 'caring for my father': 'eldercare', 'caring for my mother': 'eldercare', 'caring for dad': 'eldercare', 'looking after dad': 'eldercare', 'looking after my dad': 'eldercare', 'looking after mum': 'eldercare', 'looking after my mum': 'eldercare', 'looking after my mom': 'eldercare', 'elderly parent': 'eldercare', 'elderly parents': 'eldercare', 'aging parent': 'eldercare', 'ageing parent': 'eldercare', 'aging parents': 'eldercare', 'ageing parents': 'eldercare', 'parents fighting': 'teenmiddle', 'parents fight': 'teenmiddle', 'parents arguing': 'teenmiddle', 'parents argue': 'teenmiddle', 'stuck in the middle': 'teenmiddle', 'pick sides': 'teenmiddle', 'pick a side': 'teenmiddle', 'take sides': 'teenmiddle', 'hit me': 'controlsafe', 'hits me': 'controlsafe', 'punched the wall': 'controlsafe', 'punched a wall': 'controlsafe', 'threw my phone': 'controlsafe', 'scared of him': 'controlsafe', 'scared of her': 'controlsafe', 'afraid of him': 'controlsafe', 'afraid of her': 'controlsafe', 'smashed my': 'controlsafe', 'date night': 'datenight', 'check my phone': 'controlsafe', 'checking my phone': 'controlsafe', 'goes through my phone': 'controlsafe', 'reads my texts': 'controlsafe', 'controls the money': 'controlsafe', 'controls my money': 'controlsafe', 'gives me an allowance': 'controlsafe', 'see my friends': 'controlsafe', 'see friends': 'controlsafe', 'tracks my location': 'controlsafe', 'my passwords': 'controlsafe', 'reach out': 'reachout', 'reaching out': 'reachout', 'reaches out': 'reachout', 'phone calls': 'phonecalls', 'night shifts': 'nightfeeds', 'night shift': 'nightfeeds', 'night feed': 'nightfeeds', 'holiday schedule': 'holidayschedule', 'holiday schedules': 'holidayschedule', 'christmas schedule': 'holidayschedule', 'workpaper suite': 'workpapersuite', 'not my real dad': 'stepmom', 'not my real mom': 'stepmom', 'step parent': 'stepmom', 'step dad': 'stepmom', 'step mom': 'stepmom', 'mother in law': 'mother-in-law', 'mothers in law': 'mother-in-law', 'father in law': 'father-in-law', 'sister in law': 'sister-in-law', 'brother in law': 'brother-in-law', 'in laws': 'in-laws', 'in law': 'in-law', 'long distance': 'longdistance', 'time zone': 'timezone', 'time zones': 'timezone', 'money home': 'remittance', 'send money': 'remittance', 'sending money': 'remittance', 'sends money': 'remittance', 'need space': 'space', 'needs space': 'space', 'time out': 'timeout' };
  // words that mean the same here: each term also matches these
  var SAME = { complacent: ['complacency', 'taking for granted', 'rut', 'stale', 'autopilot', 'coasting', 'drifted'], complacency: ['complacent', 'taking for granted', 'rut', 'stale', 'autopilot', 'coasting', 'drift'], granted: ['complacency', 'taking for granted', 'unthanked', 'appreciation'],
    autism: ['autistic', 'neurodivergent', 'wired differently', 'wiring', 'neurotype'], autistic: ['autism', 'neurodivergent', 'wired differently', 'wiring'],
    adhd: ['neurodivergent', 'wired differently', 'wiring', 'attention'], dyslexia: ['easy reading', 'text size'], neurodivergent: ['wired differently', 'wiring'],
    chores: ['chore', 'housework', 'jobs', 'owner'], housework: ['chores', 'jobs'], fight: ['argument', 'conflict', 'sideways', 'row'], argument: ['fight', 'conflict'], arguing: ['fight', 'argument', 'conflict'],
    calm: ['settle', 'calm-down', 'breathe', 'soothe'], anxiety: ['worry', 'anxious', 'calm', 'stress'], anxious: ['worry', 'anxiety', 'calm'], tired: ['battery', 'rest', 'sleep', 'drained'],
    sleep: ['rest', 'tired', 'night'], burnout: ['battery', 'drained', 'overload', 'load'], stress: ['battery', 'pressure', 'load'], stressed: ['stress', 'battery', 'pressure'],
    overwhelmed: ['battery', 'calm', 'overload'], weather: ['forecast', 'today'], breathe: ['breathing', 'breath', 'calm'],
    bigger: ['text size', 'larger'], font: ['text size', 'easy reading'], erase: ['delete', 'stored', 'device'], delete: ['erase', 'stored'], privacy: ['private', 'device', 'stored'],
    unbilled: ['invisible work', 'unseen work', 'work nobody sees'], invisible: ['unseen', 'unbilled'], partner: ['partners', 'couple'], text: ['message'], message: ['text', 'words'],
    divorce: ['separation', 'separated', 'co-parent', 'co-parents', 'ex'], separated: ['divorce', 'co-parent'], separation: ['divorce', 'co-parent'],
    sorry: ['apology', 'apologize', 'repair', 'make up'], apology: ['sorry', 'apologize', 'repair'], apologize: ['apology', 'sorry', 'repair'], repair: ['apology', 'sorry'],
    puppy: ['pups', 'pup', 'tidbit', 'sugarfoot', 'pal cam'], pup: ['pups', 'tidbit', 'sugarfoot', 'pal cam'], dog: ['pups', 'pup', 'tidbit', 'sugarfoot'], pups: ['pup', 'tidbit', 'sugarfoot', 'pal cam'],
    screenshot: ['screenshots', 'screen shot', 'picture of the chat'], childhood: ['growing up', 'grew up', 'lens', 'rulebook', 'parents'], raised: ['growing up', 'childhood', 'rulebook from home', 'lens'],
    upbringing: ['growing up', 'childhood', 'rulebook'], parents: ['growing up', 'family'],
    forgot: ['forget', 'remember', 'reminder', 'owner', 'slipped'], forget: ['forgot', 'remember', 'reminder'], remember: ['reminder', 'forgot'], bill: ['bills', 'money', 'owner'], bills: ['bill', 'money', 'owner'],
    focus: ['attention', 'concentrate', 'distracted', 'easy reading', 'reading ruler', 'steps'], attention: ['focus', 'adhd'], distracted: ['focus', 'attention'], concentrate: ['focus', 'attention'],
    meltdown: ['shutdown', 'overload', 'calm-down', 'sensory'], shutdown: ['meltdown', 'overload', 'shut down'], blunt: ['direct', 'literal', 'wired differently'] };
  // doing and feeling words: the tools that help come first
  var ACT = {
    fight: ['/upset-right-now.html', '/how-to-stop-fighting-with-your-partner.html', '/conversation-reader.html', '/carrier-wave-decoder.html', '/signal-translator.html', '/workpapers/wp-09-say-it-so-it-lands.html'],
    argument: 'fight', arguing: 'fight', argue: 'fight', conflict: 'fight', snapped: 'fight', yelled: 'fight', upset: 'fight', sideways: 'fight', row: 'fight',
    chores: ['/share-the-load.html', '/chore-chart-for-couples.html', '/lemonade-stand.html', '/workpapers/wp-03-one-owner-per-job.html', '/workpapers/wp-01.html'], chore: 'chores', housework: 'chores', dishes: 'chores', laundry: 'chores', cleaning: 'chores', split: 'chores', fair: 'chores',
    breathe: ['#breathe', '/wp-11.html', '/night-garden.html', '/soundscapes.html'], breathing: 'breathe', breath: 'breathe',
    calm: ['/upset-right-now.html', '#breathe', '/wp-11.html', '/night-garden.html', '/calm-visualizer.html', '/soundscapes.html'], relax: 'calm', settle: 'calm', soothe: 'calm', anxiety: 'calm', anxious: 'calm', worry: 'calm', overwhelmed: 'calm', stress: 'calm', stressed: 'calm', panic: 'calm',
    tired: ['/quick-checks.html', '/workpapers/wp-02-how-much-are-you-carrying.html', '/wp-11.html'], exhausted: 'tired', drained: 'tired', burnout: 'tired', battery: 'tired', sleep: ['/soundscapes.html', '/night-garden.html', '#breathe'],
    weather: ['/quick-checks.html'], mood: 'weather', feeling: 'weather', today: 'weather', forecast: 'weather',
    message: ['/signal-translator.html', '/workpapers/wp-09-say-it-so-it-lands.html', '/conversation-reader.html'], text: 'message', say: 'message', words: 'message', email: 'message',
    game: ['/pause-and-play.html'], games: 'game', play: 'game', puzzle: 'game',
    autism: ['/wired-differently.html', '/wavelength.html', '/wiring-card.html', '/know-yourself.html'], autistic: 'autism', adhd: 'autism', neurodivergent: 'autism', wiring: 'autism', sensory: 'autism',
    personality: ['/wavelength.html', '/know-yourself.html'], quiz: 'personality', archetype: 'personality', wavelength: 'personality', heartprint: 'personality', neurotype: 'personality', audhd: 'autism',
    dyslexia: ['#settings', '/wired-differently.html'], listen: ['#settings'], aloud: ['#settings'], read: null, larger: ['#settings'], size: ['#settings'], bigger: ['#settings'], font: ['#settings'], quiet: ['#settings'], dark: ['#settings'], settings: ['#settings'],
    safe: ['/safety.html', '/on-this-device.html', '/upset-right-now.html'], safety: 'safe', unsafe: 'safe', abuse: 'safe', abused: 'safe', abusive: 'safe', abuser: 'safe', violence: 'safe', violent: 'safe',
    hotline: 'safe', helpline: 'safe', danger: 'safe', dangerous: 'safe', scared: 'safe', afraid: 'safe', threat: 'safe', threatened: 'safe', threatens: 'safe', controlling: 'safe', coercive: 'safe', hide: 'safe', escape: 'safe', dv: 'safe', hurts: 'safe', hit: 'safe', hits: 'safe', stalking: 'safe',
    boundaries: ['/book/self-2-now-in-depth.html', '/self-path.html', '/workpapers/wp-01.html', '/library/connection.html'], boundary: 'boundaries', overgiving: 'boundaries', 'over-giving': 'boundaries', giving: 'boundaries', control: 'boundaries', pleaser: 'boundaries', pleasing: 'boundaries', energy: 'boundaries', resentment: 'boundaries',
    kids: ['/parents.html', '/frequency-buddies.html', '/library/life.html', '/growing-up.html'], kid: 'kids', child: 'kids', children: 'kids', parenting: 'kids', siblings: 'kids', sibling: 'kids', brothers: 'kids', sisters: 'kids', tantrum: 'kids', tantrums: 'kids',
    teen: ['/parents.html', '/teens.html', '/library/life.html', '/turning-toward.html', '/workpapers/wp-13-daily-check-in.html'], teenager: 'teen', teenagers: 'teen', teenage: 'teen', son: 'teen', daughter: 'teen', adolescent: 'teen',
    teens: ['/teens.html', '/library/life.html'], crush: 'teens', dating: 'teens', bullied: 'teens', bullying: 'teens', school: 'teens', grounded: 'teens', curfew: 'teens',
    group: ['/groups.html', '/check-ins.html'], groups: 'group', leader: 'group', facilitator: 'group', church: 'group', class: 'group', discussion: 'group', curriculum: 'group', course: 'group',
    unheard: ['/check-ins.html', '/how-to-stop-fighting-with-your-partner.html', '/signal-translator.html'], ignored: 'unheard', dismissed: 'unheard',
    grief: ['/grief.html', '/library/emotions.html', '/grandparents.html', '/self-path.html'], retirement: ['/retired-together.html', '/grief.html'], retired: 'retirement', retiring: 'retirement', reconnect: ['/turning-toward.html', '/recheck-drive.html', '/grief.html'], reconnecting: 'reconnect', estranged: 'reconnect',
    yelling: ['/parents.html', '/upset-right-now.html', '/wp-11.html'], yell: 'yelling', yelled: 'yelling', shouting: 'yelling', screaming: 'yelling',
    dementia: ['/caregivers.html', '/library/stress.html', '/workpapers/wp-02-how-much-are-you-carrying.html'], alzheimers: 'dementia', alzheimer: 'dementia', respite: 'dementia', carer: 'dementia', carers: 'dementia', caregiver: 'dementia', caregivers: 'dementia', caregiving: 'dementia',
    pronouns: ['/teens.html', '/safety.html'], lgbtq: 'pronouns', lgbt: 'pronouns', gay: 'pronouns', lesbian: 'pronouns', bisexual: 'pronouns', trans: 'pronouns', transgender: 'pronouns', nonbinary: 'pronouns', queer: 'pronouns',
    harassment: ['/safety.html', '/co-parenting.html'], harassing: 'harassment', harass: 'harassment', cutting: ['/teens.html', '/safety.html'], selfharm: 'cutting',
    espanol: ['/en-espanol.html'], spanish: 'espanol', 'español': 'espanol',
    flat: ['/complacency.html', '/turning-toward.html', '/recheck-drive.html'], routine: 'flat',
    stepmom: ['/parents.html#stepfamilies', '/parents.html', '/co-parenting.html'], stepmother: 'stepmom', stepdad: 'stepmom', stepfather: 'stepmom', stepparent: 'stepmom', stepparents: 'stepmom', stepkids: 'stepmom', stepchildren: 'stepmom', stepson: 'stepmom', stepdaughter: 'stepmom', blended: 'stepmom', stepfamily: 'stepmom', stepfamilies: 'stepmom',
    lonely: ['/library/connection.html', '/grief.html', '/turning-toward.html'], loneliness: 'lonely', alone: 'lonely', isolated: 'lonely',
    grown: ['/grief.html', '/grandparents.html'], adult: 'grown',
    work: ['/work.html', '/appreciation-at-work.html', '/relationships.html'], workplace: 'work', job: 'work', office: 'work', coworker: 'work', coworkers: 'work', colleague: 'work', colleagues: 'work', team: 'work', teams: 'work', manager: 'work', boss: 'work', employee: 'work', employees: 'work', staff: 'work', grieving: 'grief', widow: 'grief', widower: 'grief', widowed: 'grief', bereaved: 'grief', bereavement: 'grief', mourning: 'grief', died: 'grief', loss: 'grief',
    stonewalling: ['/pursue-withdraw.html', '/upset-right-now.html', '/how-to-stop-fighting-with-your-partner.html', '/wp-11.html'], stonewall: 'stonewalling', withdraw: 'stonewalling', withdraws: 'stonewalling', pursue: 'stonewalling', pursuer: 'stonewalling', pursues: 'stonewalling', space: 'stonewalling', pause: 'stonewalling', timeout: 'stonewalling',
    'in-laws': ['/family-obligations.html#visits', '/library/life.html#in-laws', '/library/conflict.html#family-disagreements', '/family-obligations.html'], 'in-law': 'in-laws', inlaws: 'in-laws', inlaw: 'in-laws', 'mother-in-law': 'in-laws', 'father-in-law': 'in-laws', 'sister-in-law': 'in-laws', 'brother-in-law': 'in-laws', motherinlaw: 'in-laws', fatherinlaw: 'in-laws', 'mothers-in-law': 'in-laws', extended: 'in-laws', culture: 'in-laws', cultures: 'in-laws', cultural: 'in-laws',
    remittance: ['/family-obligations.html', '/library/life.html'], remittances: 'remittance', remit: 'remittance', money: ['/lemonade-stand.html', '/family-obligations.html'], savings: 'money', saving: 'money', finances: 'money',
    sentthis: ['/sent-this.html'], holidayschedule: ['/co-parenting.html'], workpapersuite: ['/workpapers/fill/suite.html', '/full-path.html'], worksheets: 'workpapersuite', workpapers: 'workpapersuite', fulltime: ['/lemonade-stand.html', '/new-parent.html', '/share-the-load.html'], nightfeeds: ['/new-parent.html', '/lemonade-stand.html'],
    teenmiddle: ['/teens.html#middle', '/teens.html', '/parents.html'], brother: ['/teens.html#siblings', '/parents.html#siblings'], sister: 'brother', brothers: 'brother', sisters: 'brother', sibling: 'brother', siblings: 'brother',
    eldercare: ['/caregivers.html', '/family-obligations.html'], elderly: 'eldercare', dementia: 'eldercare', alzheimers: 'eldercare', dad: ['/caregivers.html', '/parents.html', '/teens.html'], mum: 'dad', mom: 'dad', father: 'dad', mother: 'dad',
    rentlate: ['/share-the-load.html#roommates', '/lemonade-stand.html'], housemates: 'rentlate', flatmates: 'rentlate', housemate: 'rentlate', flatmate: 'rentlate',
    ndcouple: ['/neurodivergent-relationships.html', '/wiring-card.html', '/wavelength.html'],
    controlsafe: ['/safety.html', '/ask.html'], punched: 'controlsafe', threw: 'controlsafe', smashed: 'controlsafe', datenight: ['/turning-toward.html', '/recheck-drive.html', '/check-ins.html'], controlling: 'controlsafe', coercive: 'controlsafe', template: 'workpapersuite', templates: 'workpapersuite', handover: ['/work.html', '/workpapers/wp-03-one-owner-per-job.html'], handovers: 'handover',
    longdistance: ['/long-distance.html', '/turning-toward.html', '/check-ins.html'], calling: ['/long-distance.html#rhythm', '/long-distance.html', '/turning-toward.html'], calls: 'calling', phonecalls: 'calling', reachout: 'calling', ldr: 'longdistance', timezone: 'longdistance', timezones: 'longdistance', apart: 'longdistance',
    grandfather: ['/grandparents.html'], grandpa: 'grandfather', grandmother: 'grandfather', grandma: 'grandfather', grandparent: 'grandfather', grandkids: 'grandfather', grandchildren: 'grandfather',
    erase: ['/on-this-device.html'], delete: ['/on-this-device.html'], stored: ['/on-this-device.html'], privacy: ['/on-this-device.html', '/legal/privacy-policy.html'],
    minutes: ['/start-in-10-minutes.html', '/quick-checks.html'], start: ['/start-here.html', '/start-in-10-minutes.html'],
    chat: ['/ask.html'], ask: ['/ask.html'], question: ['/ask.html'], professor: ['/ask.html'],
    divorce: ['/co-parenting.html', '/relationships.html', '/library/life.html', '/check-ins.html', '/signal-translator.html'], separated: 'divorce', separation: 'divorce', ex: 'divorce', coparent: 'divorce',
    arcade: ['/frequency-journey.html'], maze: 'arcade', chase: 'arcade', crossing: 'arcade',
    complacent: ['/complacency.html', '/complacency-in-depth.html', '/turning-toward.html', '/workpapers/wp-13-daily-check-in.html'], touchstone: ['/touchstones.html', '/complacency.html#touchstones', '/library/connection.html#shared-language', '/turning-toward.html#rituals'], touchstones: 'touchstone', idiom: 'touchstone', idioms: 'touchstone', petname: 'touchstone', nickname: 'touchstone', nicknames: 'touchstone', petname: 'touchstone', joke: 'touchstone', jokes: 'touchstone', catchphrase: 'touchstone', codeword: 'touchstone', complacency: 'complacent', stale: 'complacent', boring: 'complacent', bored: 'complacent', rut: 'complacent', drifting: 'complacent', drift: 'complacent', granted: 'complacent', coasting: 'complacent', autopilot: 'complacent', spark: 'complacent',
    sorry: ['/apology-languages.html', '/library/conflict.html', '/signal-translator.html', '/conversation-reader.html', '/workpapers/wp-09-say-it-so-it-lands.html'], apology: 'sorry', apologize: 'sorry', repair: 'sorry', forgive: 'sorry',
    puppy: ['#palcam', '/frequency-buddies.html', '/frequency-journey.html', '/pal-cam-tv.html'], pup: 'puppy', pups: 'puppy', dog: 'puppy', tidbit: 'puppy', sugarfoot: 'puppy',
    screenshot: ['/conversation-reader.html'],
    childhood: ['/growing-up.html', '/growing-up-in-depth.html', '/know-yourself.html'], raised: 'childhood', upbringing: 'childhood', parents: 'childhood', grew: 'childhood', growing: 'childhood', family: ['/growing-up.html', '/relationships.html'],
    forgot: ['/workpapers/wp-03-one-owner-per-job.html', '/signal-translator.html', '/lemonade-stand.html', '/ask.html'], forget: 'forgot', remember: 'forgot', reminder: 'forgot', bill: ['/workpapers/wp-03-one-owner-per-job.html', '/lemonade-stand.html', '/signal-translator.html'], bills: 'bill',
    focus: ['#settings', '/start-in-10-minutes.html', '#breathe', '/quick-checks.html'], attention: 'focus', distracted: 'focus', concentrate: 'focus',
    meltdown: ['/wp-11.html', '#breathe', '/wiring-card.html', '/wired-differently.html'], shutdown: 'meltdown', overload: 'meltdown',
    blunt: ['/wired-differently.html', '/signal-translator.html', '/wiring-card.html'],
    baby: ['/new-parent.html', '/share-the-load.html', '/chore-chart-for-couples.html', '/invisible-labor-mental-load.html'], newborn: 'baby', infant: 'baby', toddler: 'baby', postpartum: 'baby', newparent: 'baby', sleepless: 'baby',
    roommate: ['/share-the-load.html', '/lemonade-stand.html', '/chore-chart-for-couples.html'], roommates: 'roommate', housemate: 'roommate', housemates: 'roommate', flatmate: 'roommate', flatmates: 'roommate',
    install: ['/install.html'], app: 'install', android: 'install', widget: 'install', widgets: 'install', homescreen: 'install', offline: 'install', phone: 'install',
    appreciate: ['/appreciation-at-work.html', '/love-languages.html'], appreciation: 'appreciate', languages: ['/languages-of-connection.html', '/love-languages.html'], connection: ['/languages-of-connection.html'],
    love: ['/love-languages.html', '/turning-toward.html', '/complacency.html'], language: 'love', chapman: 'love', affirmation: 'love', thanks: 'love', gifts: 'love', touch: 'love', appreciated: 'love', cared: 'love',
    recommend: ['/soundscapes.html'], recommendation: 'recommend', pick: 'recommend', which: 'recommend',
    brain: ['/soundscapes.html'], breakers: 'brain', wrecked: 'brain', instrumental: 'brain', shimmer: 'brain', thunderous: 'brain', shooting: 'brain',
    haptic: ['/soundscapes.html'], haptics: 'haptic', vibration: 'haptic', vibrate: 'haptic', buzz: 'haptic', rumble: 'haptic', synesthesia: 'haptic', visualize: 'haptic', aurora: 'haptic',
    surprise: ['/surprise.html'], random: 'surprise', bored: 'surprise', wander: 'surprise', stumble: 'surprise',
    formula: ['/method-and-limits.html'], formulas: 'formula', method: 'formula', score: 'formula', scoring: 'formula', limits: 'formula',
    mad: 'fight', angry: 'fight', annoyed: 'fight', frustrated: 'fight'
  };
  // ---- situations people told us about (round 7): their words lead straight to the page written for them ----
  // phrases first (JOIN turns each into one search word), then that word's pages, best first (ACT)
  [
    ['games all night|gaming all night|plays games all night|video games|video game|screen time|phone all night|on his phone|on her phone|on their phone|always on his phone|always on her phone|ignores me|ignoring me', 'gaming'],
    ['co parenting|co parent|co parents|shared custody|joint custody|every other weekend|my ex|my ex-husband|my ex-wife|ex husband|ex wife|holiday handover', 'coparenting'],
    ['break up|broke up|broken up|breaking up|on my own|single dad|single mum|single mom|single parent|single father|single mother|part time dad|part time mum|part time mom|part time parent|part-time parent|after divorce|after my divorce|after the divorce', 'onmyown'],
    ['best friend|best friends|one sided friendship|one-sided friendship|one sided|friend never texts back|never texts back|doesnt text back|doesn\'t text back|never texts me back|always the one reaching out|always reaching out|friendship drifted|friend drifted', 'friendship'],
    ['non monogamous|non-monogamous|ethically non monogamous|my two partners|both my partners|my other partner|both of my partners|feel like a guest|feels like a guest|like a guest in my own home|like a guest', 'polyamory'],
    ['came home|coming home|back home after|home from deployment|home from the army|work away|working away|away for work|air force|time apart', 'cominghome'],
    ['night shift|night shifts|nightshift|shift work|shift worker|shift workers|work nights|works nights|working nights|opposite schedules|opposite shifts|different schedules|different hours|work from home|works from home|working from home|always available', 'diffhours'],
    ['naming the baby|name the baby|baby name|baby names|different faith|different faiths|different religion|different religions|two faiths|two religions|mixed faith', 'twofaiths'],
    ['foster carers|foster carer|foster care|foster parent|foster parents|kinship carer|kinship carers|kinship care|social worker|social workers|raising grandchildren|raising my grandchildren|raising grandkids|raising my grandkids|raising my grandson|raising my granddaughter|special guardianship|special guardian|parent in treatment|parent in rehab|in rehab', 'fostering'],
    ['adhd children|adhd child|adhd kid|adhd kids|adhd son|adhd daughter|child with adhd|kid with adhd|son has adhd|daughter has adhd|child has adhd|cant sit still|can\'t sit still|cannot sit still|wont sit still|won\'t sit still|forgets everything', 'adhdkid'],
    ['boundaries with my mum|boundaries with my mom|boundaries with my mother|boundaries with my dad|boundaries with my father|boundaries with my parents|boundaries with parents|boundaries with mum|boundaries with mom|unsolicited advice|drops in|drops by|drop in|turns up unannounced|shows up unannounced|mother oversteps|mum oversteps|mom oversteps|my mum oversteps|my mom oversteps|parents overstep|my parents overstep', 'grownkids'],
    ['saver spender|saver and spender|saver and a spender|money styles|money style|moving in together|move in together|moved in together|moving in|move in|wedding costs|wedding cost|cost of the wedding|joint account|joint bank account|controlling with money|tight with money', 'moneytogether'],
    ['coming out|came out|come out|same sex|same-sex', 'comingout'],
    ['for professionals|for therapists|for counsellors|for counselors|my clients', 'counselors'],
    ['roommate in my room|sharing a room|share a room|shared room|shared bedroom|quiet hours|overnight guests|overnight guest|room agreement|roommate agreement|resident assistant', 'sharedroom'],
    ['business partner|business partners|co founder|co founders|co owner|co owners|small business|family business|run a business together|our shop', 'bizpartner'],
    ['autistic at work|autism at work|adhd at work|neurodivergent at work|written instructions|too loud|quiet break|open plan office', 'ndwork'],
    ['2 year old|2 year olds|two year old|two year olds|3 year old|three year old|1 year old|one year old|year old twins', 'toddler'],
    ['anger management|losing my temper|lose my temper|lost my temper|i yell|i shout|i scream|am i abusive|am i an abuser|am i the abuser|am i the abusive one|i scared my son|i scared my daughter|i scared my kids|my anger|my temper|short temper|short fuse', 'angerhelp'],
    ['caring for my wife|caring for my husband|caring for my partner|caring for my spouse|looking after my wife|looking after my husband|looking after my partner|sick partner|ill partner|partner is ill|partner is sick|chronic illness|chronic pain|long covid|me/cfs|me cfs|chronic fatigue', 'whenill'],
    ['empty nest|empty nester|empty nesters|kids left home|kids have left|kids moved out|kids grown|kids are grown|kids are grown up|children left home|like roommates|like flatmates|quiet house', 'emptynest'],
    ['family rift|family rifts|family feud|family estrangement|estranged sibling|estranged brother|estranged sister|favourite child|favorite child|golden child|haven\'t spoken|havent spoken|have not spoken|not speaking|not spoken|stopped speaking|a will|the will|mum\'s will|mom\'s will|dad\'s will|their will|her will|his will|adult siblings|grown siblings', 'familyrift'],
    ['questions to ask each other|questions to ask|things to ask each other|get to know each other', 'askeachother'],
    ['print this|print the page|print this page|printable|printing', 'print']
  ].forEach(function (r) { r[0].split('|').forEach(function (k) { JOIN[k] = r[1]; }); });
  var ACT_MORE = {
    gaming: ['/gaming-and-time-together.html', '/turning-toward.html', '/check-ins.html'], gamer: 'gaming', xbox: 'gaming', playstation: 'gaming', ps5: 'gaming', ps4: 'gaming', nintendo: 'gaming', fortnite: 'gaming', minecraft: 'gaming', esports: 'gaming', screentime: 'gaming', tiktok: 'gaming', scrolling: 'gaming', doomscrolling: 'gaming',
    coparenting: ['/co-parenting.html', '/on-my-own.html', '/parents.html#stepfamilies'], 'co-parenting': 'coparenting', 'co-parent': 'coparenting', 'co-parents': 'coparenting', coparent: 'coparenting', coparents: 'coparenting', custody: 'coparenting', handoff: 'coparenting', handoffs: 'coparenting', 'ex-husband': 'coparenting', 'ex-wife': 'coparenting', 'ex-partner': 'coparenting', ex: 'coparenting', exes: 'coparenting', holidayschedule: 'coparenting', separated: 'coparenting', separation: 'coparenting',
    onmyown: ['/on-my-own.html', '/co-parenting.html', '/grief.html'], divorce: 'onmyown', divorced: 'onmyown', divorcing: 'onmyown', breakup: 'onmyown', 'break-up': 'onmyown', single: 'onmyown', 'part-time': 'onmyown', heartbreak: 'onmyown', heartbroken: 'onmyown', dumped: 'onmyown',
    friendship: ['/friends.html', '/turning-toward.html', '/library/connection.html'], friend: 'friendship', friends: 'friendship', friendships: 'friendship', bff: 'friendship', 'one-sided': 'friendship', drifted: 'friendship', ghosted: 'friendship', reachout: ['/friends.html', '/long-distance.html#rhythm', '/long-distance.html'],
    polyamory: ['/more-than-two.html', '/check-ins.html', '/share-the-load.html'], polyamorous: 'polyamory', poly: 'polyamory', triad: 'polyamory', triads: 'polyamory', throuple: 'polyamory', throuples: 'polyamory', 'non-monogamous': 'polyamory', nonmonogamous: 'polyamory', 'non-monogamy': 'polyamory', nonmonogamy: 'polyamory', enm: 'polyamory', metamour: 'polyamory', metamours: 'polyamory', polycule: 'polyamory', nesting: 'polyamory',
    cominghome: ['/coming-home.html', '/long-distance.html', '/turning-toward.html'], deployment: 'cominghome', deployed: 'cominghome', deploy: 'cominghome', deploying: 'cominghome', military: 'cominghome', army: 'cominghome', navy: 'cominghome', marines: 'cominghome', soldier: 'cominghome', soldiers: 'cominghome', veteran: 'cominghome', veterans: 'cominghome', homecoming: 'cominghome', reunion: 'cominghome', reunited: 'cominghome', reintegration: 'cominghome', nightmares: 'cominghome', nightmare: 'cominghome', ptsd: 'cominghome', fifo: 'cominghome', offshore: 'cominghome', rotation: 'cominghome',
    diffhours: ['/different-hours.html', '/share-the-load.html', '/check-ins.html'], nights: 'diffhours', shifts: 'diffhours', wfh: 'diffhours', remote: 'diffhours', nightfeeds: ['/new-parent.html', '/different-hours.html', '/lemonade-stand.html'],
    twofaiths: ['/two-faiths.html', '/family-obligations.html', '/library/life.html#in-laws'], religion: 'twofaiths', religions: 'twofaiths', religious: 'twofaiths', faith: 'twofaiths', faiths: 'twofaiths', interfaith: 'twofaiths', muslim: 'twofaiths', muslims: 'twofaiths', islam: 'twofaiths', islamic: 'twofaiths', christian: 'twofaiths', christians: 'twofaiths', christianity: 'twofaiths', catholic: 'twofaiths', catholics: 'twofaiths', protestant: 'twofaiths', jewish: 'twofaiths', jew: 'twofaiths', judaism: 'twofaiths', hindu: 'twofaiths', hinduism: 'twofaiths', sikh: 'twofaiths', buddhist: 'twofaiths', atheist: 'twofaiths', eid: 'twofaiths', ramadan: 'twofaiths', christmas: 'twofaiths', easter: 'twofaiths', diwali: 'twofaiths', hanukkah: 'twofaiths', chanukah: 'twofaiths', passover: 'twofaiths', baptism: 'twofaiths', baptise: 'twofaiths', baptize: 'twofaiths', christening: 'twofaiths', mosque: 'twofaiths', synagogue: 'twofaiths', prayer: 'twofaiths', pray: 'twofaiths', halal: 'twofaiths', kosher: 'twofaiths',
    fostering: ['/foster-and-kinship.html', '/grandparents.html', '/parents.html'], foster: 'fostering', fostered: 'fostering', fosters: 'fostering', adopted: 'fostering', adoption: 'fostering', adopt: 'fostering', adopting: 'fostering', adoptive: 'fostering', adoptee: 'fostering', kinship: 'fostering', guardianship: 'fostering', guardian: 'fostering', grandson: 'fostering', granddaughter: 'fostering', grandsons: 'fostering', granddaughters: 'fostering', rehab: 'fostering', addiction: 'fostering', addicted: 'fostering', 'looked-after': 'fostering',
    adhdkid: ['/adhd-kids.html', '/parents.html', '/neurodivergent-relationships.html'], fidgeting: 'adhdkid', fidget: 'adhdkid', fidgets: 'adhdkid', fidgety: 'adhdkid', hyperactive: 'adhdkid', impulsive: 'adhdkid',
    grownkids: ['/grown-up-children.html', '/family-obligations.html#visits', '/grandparents.html'], oversteps: 'grownkids', overstep: 'grownkids', overstepping: 'grownkids', unannounced: 'grownkids', meddling: 'grownkids', interfering: 'grownkids',
    moneytogether: ['/money-together.html', '/lemonade-stand.html', '/family-obligations.html'], saver: 'moneytogether', savers: 'moneytogether', spender: 'moneytogether', spenders: 'moneytogether', spending: 'moneytogether', wedding: 'moneytogether', weddings: 'moneytogether', prenup: 'moneytogether', prenuptial: 'moneytogether', budget: 'moneytogether', budgeting: 'moneytogether', debt: 'moneytogether', debts: 'moneytogether', fiance: 'moneytogether', fiancee: 'moneytogether', engaged: 'moneytogether', engagement: 'moneytogether', money: ['/money-together.html', '/lemonade-stand.html', '/family-obligations.html'],
    comingout: ['/coming-out.html', '/teens.html', '/safety.html'], gay: 'comingout', lesbian: 'comingout', bisexual: 'comingout', bi: 'comingout', queer: 'comingout', lgbt: 'comingout', lgbtq: 'comingout', 'lgbtq+': 'comingout', lgbtqia: 'comingout', homosexual: 'comingout', sexuality: 'comingout', closeted: 'comingout', closet: 'comingout',
    counselors: ['/for-counselors.html', '/groups.html', '/check-ins.html'], therapist: 'counselors', therapists: 'counselors', counsellor: 'counselors', counselor: 'counselors', counsellors: 'counselors', client: 'counselors', clients: 'counselors', professional: 'counselors', professionals: 'counselors', practitioner: 'counselors', practitioners: 'counselors', coach: 'counselors', coaches: 'counselors', therapy: 'counselors', counselling: 'counselors', counseling: 'counselors', psychologist: 'counselors', 'social-worker': 'counselors',
    sharedroom: ['/sharing-a-room.html', '/share-the-load.html#roommates', '/upset-right-now.html'], dorm: 'sharedroom', dorms: 'sharedroom', dormitory: 'sharedroom', college: 'sharedroom', university: 'sharedroom', uni: 'sharedroom', campus: 'sharedroom', freshman: 'sharedroom', ra: 'sharedroom', bunk: 'sharedroom',
    roommate: ['/sharing-a-room.html', '/share-the-load.html#roommates', '/share-the-load.html', '/lemonade-stand.html'], roommates: 'roommate', housemate: 'roommate', housemates: 'roommate', flatmate: 'roommate', flatmates: 'roommate', roomie: 'roommate',
    bizpartner: ['/work.html#owner-list', '/work.html', '/signal-translator.html'], cofounder: 'bizpartner', cofounders: 'bizpartner', 'co-founder': 'bizpartner', 'co-founders': 'bizpartner', 'co-owner': 'bizpartner', 'co-owners': 'bizpartner', coowner: 'bizpartner', business: 'bizpartner', startup: 'bizpartner', bakery: 'bizpartner', shop: 'bizpartner',
    ndwork: ['/work.html#neurodiversity', '/wiring-card.html', '/work.html', '/wired-differently.html'], rude: ['/work.html', '/wiring-card.html', '/signal-translator.html', '/wired-differently.html'], blunt: 'rude', abrupt: 'rude', curt: 'rude',
    toddler: ['/new-parent.html', '/parents.html', '/share-the-load.html'], toddlers: 'toddler', twins: 'toddler', twin: 'toddler', triplets: 'toddler', preschooler: 'toddler', baby: ['/new-parent.html', '/share-the-load.html', '/chore-chart-for-couples.html', '/invisible-labor-mental-load.html'], newborn: 'baby', infant: 'baby', postpartum: 'baby', newparent: 'baby', sleepless: 'baby',
    espanol: ['/en-espanol.html'], spanish: 'espanol', 'español': 'espanol', ayuda: 'espanol', pareja: 'espanol', esposa: 'espanol', esposo: 'espanol', marido: 'espanol', cuidador: 'espanol', cuidadora: 'espanol', cuidadores: 'espanol', cuidar: 'espanol', gemelos: 'espanol', gemelas: 'espanol', hijos: 'espanol', hijo: 'espanol', hija: 'espanol', hijas: 'espanol', ninos: 'espanol', nino: 'espanol', bebe: 'espanol', pelea: 'espanol', peleas: 'espanol', pelean: 'espanol', peleamos: 'espanol', enojado: 'espanol', enojada: 'espanol', enojo: 'espanol', miedo: 'espanol', familia: 'espanol', divorcio: 'espanol', separados: 'espanol', suegra: 'espanol', suegro: 'espanol', abuela: 'espanol', abuelo: 'espanol', abuelos: 'espanol', trabajo: 'espanol', dinero: 'espanol', tareas: 'espanol', quehaceres: 'espanol', casa: 'espanol', ayudame: 'espanol', necesito: 'espanol', violencia: 'espanol', seguridad: 'espanol', calma: 'espanol', tranquilo: 'espanol', cansado: 'espanol', cansada: 'espanol', madre: 'espanol', padre: 'espanol', novio: 'espanol', novia: 'espanol', amor: 'espanol', relacion: 'espanol', matrimonio: 'espanol', discutir: 'espanol', gritar: 'espanol', grita: 'espanol', gritos: 'espanol', castellano: 'espanol', latino: 'espanol', latina: 'espanol',
    angerhelp: ['/parents.html#anger-help', '/upset-right-now.html', '/parents.html', '/wp-11.html'], temper: 'angerhelp',
    whenill: ['/when-one-is-ill.html', '/caregivers.html', '/share-the-load.html'], chronic: 'whenill', illness: 'whenill', ill: 'whenill', disability: 'whenill', disabled: 'whenill', disabilities: 'whenill', cfs: 'whenill', fibromyalgia: 'whenill', fibro: 'whenill', spoons: 'whenill', spoonie: 'whenill', burden: 'whenill', mecfs: 'whenill', lupus: 'whenill', 'ms': 'whenill', arthritis: 'whenill', cancer: 'whenill', chemo: 'whenill',
    caregiving: ['/caregivers.html', '/when-one-is-ill.html', '/workpapers/wp-02-how-much-are-you-carrying.html'], carer: 'caregiving', carers: 'caregiving', caregiver: 'caregiving', caregivers: 'caregiving', caring: 'caregiving', respite: 'caregiving', parkinson: 'caregiving', parkinsons: 'caregiving', dementia: 'caregiving', alzheimers: 'caregiving', alzheimer: 'caregiving', stroke: 'caregiving', eldercare: ['/caregivers.html', '/family-obligations.html'], elderly: 'eldercare',
    emptynest: ['/empty-nest.html', '/retired-together.html', '/turning-toward.html'], nest: 'emptynest',
    familyrift: ['/family-rifts.html', '/grief.html', '/teens.html#siblings'], brother: 'familyrift', sister: 'familyrift', brothers: 'familyrift', sisters: 'familyrift', sibling: 'familyrift', siblings: 'familyrift', estranged: 'familyrift', estrangement: 'familyrift', rift: 'familyrift', rifts: 'familyrift', feud: 'familyrift', feuding: 'familyrift', inheritance: 'familyrift', inherit: 'familyrift', inherited: 'familyrift', estate: 'familyrift', executor: 'familyrift', favourite: 'familyrift', favorite: 'familyrift', favouritism: 'familyrift', favoritism: 'familyrift', reconcile: 'familyrift', reconciliation: 'familyrift', reconciling: 'familyrift', reconnect: ['/family-rifts.html', '/turning-toward.html', '/recheck-drive.html', '/grief.html'],
    grandfather: ['/grandparents.html'], grandpa: 'grandfather', grandmother: 'grandfather', grandma: 'grandfather', grandparent: 'grandfather', grandparents: 'grandfather', grandkids: 'grandfather', grandchildren: 'grandfather', grandchild: 'grandfather', nan: 'grandfather', nana: 'grandfather', nanna: 'grandfather', gran: 'grandfather', granny: 'grandfather', grandad: 'grandfather', granddad: 'grandfather', gramps: 'grandfather', abuelita: 'espanol',
    askeachother: ['/turning-toward-in-depth.html#their-world', '/turning-toward.html', '/check-ins.html'],
    print: ['#print', '/chore-chart-for-couples.html', '/workpapers/fill/suite.html', '/infographic.html'], printing: 'print', printable: 'print', printout: 'print', pdf: 'print',
    // the plain meaning of these is a feeling or a fight, not the site's Quiet mode or the app
    phone: ['/install.html', '/gaming-and-time-together.html'], quiet: ['#settings', '/sharing-a-room.html']
  };
  Object.keys(ACT_MORE).forEach(function (k) { ACT[k] = ACT_MORE[k]; });
  // a word chain ends in a list of pages; anything else (a loop, a missing name) is no list at all
  function actFor(t) { var v = ACT[t], n = 0; while (typeof v === 'string' && n++ < 6) v = ACT[v]; return Array.isArray(v) ? v : null; }
  // results that aren't pages
  var EXTRA = {
    '#breathe': { u: '#breathe', t: 'Breathe: a breathing break', d: 'Opens right here, on top of this page: box breathing, calm breathing or 4-7-8, for one, three or five minutes, with or without sound.', k: 'Tool' },
    '#settings': { u: '#settings', t: 'Settings: text size, Easy reading, Quiet mode', d: 'Bigger text, an easy-to-read font, roomy spacing, a page tint, a reading ruler, dark mode, Quiet mode and site sounds. Long pages also have “In short” and “Show me only the steps”.', k: 'Settings' },
    '/parents.html#stepfamilies': { u: '/parents.html#stepfamilies', t: 'Stepfamilies and blended families', d: 'Joining two families takes time. Who leads on rules, loyalty binds, names, a child who lives in two homes, and the stepparent’s own place.', k: 'Guide' },
    '/family-obligations.html#visits': { u: '/family-obligations.html#visits', t: 'In-laws: visits, long stays and elders', d: 'When a parent or in-law visits often or stays a long time: agree it together first, each of you speaks to your own family, and plan the visit before it starts.', k: 'Guide' },
    '/library/life.html#in-laws': { u: '/library/life.html#in-laws', t: 'In-laws (mother-in-law, father-in-law)', d: 'Two families meeting in one couple: loyalty to a parent is not disloyalty to a partner. What helps, in plain words.', k: 'Library' },
    '/library/conflict.html#family-disagreements': { u: '/library/conflict.html#family-disagreements', t: 'Disagreeing about family and in-laws', d: 'Even-handed: loyalty to a parent is not disloyalty to a partner. How to talk it through.', k: 'Library' },
    '/teens.html#middle': { u: '/teens.html#middle', t: 'For teens: when your parents fight with each other', d: 'It isn’t your job to fix their relationship, and you don’t have to pick a side. Words to use, space when it’s loud, and help if it ever feels scary.', k: 'Teens' },
    '/teens.html#siblings': { u: '/teens.html#siblings', t: 'For teens: brothers and sisters', d: 'Fighting with a brother or sister is common. Simple rules for space and stuff, walking away, and what to say.', k: 'Teens' },
    '/parents.html#siblings': { u: '/parents.html#siblings', t: 'Siblings who fight (for parents)', d: 'What helps when brothers and sisters clash: fair rules, not taking sides, one-to-one time.', k: 'Guide' },
    '/share-the-load.html#roommates': { u: '/share-the-load.html#roommates', t: 'Roommates and housemates: rent, bills and three or more people', d: 'Start with the numbers, not with who is late. A house rule for rent day, shared supplies, and a fridge list with one owner per job.', k: 'Guide' },
    '/long-distance.html#rhythm': { u: '/long-distance.html#rhythm', t: 'Long distance: who calls, and how often', d: 'If one of you does most of the reaching out, that’s real information, not scorekeeping; and calling less is usually about the hours, not the love. Agree it, with words for each of you.', k: 'Guide' },
    '/workpapers/fill/suite.html': { u: '/workpapers/fill/suite.html', t: 'The Workpaper Suite', d: 'Every worksheet in one place: pick your road, fill them in on screen, combine two people’s files, and make one report.', k: 'Tool' },
    '#palcam': { u: '#palcam', t: 'Check in on Tidbit & Sugarfoot (the pal cam)', d: 'Opens right here: a peek at the two pups, Tidbit and Sugarfoot, with little captions. You can turn the sound off.', k: 'Pups' }
  };
  EXTRA['/parents.html#anger-help'] = { u: '/parents.html#anger-help', t: 'Getting help for your anger', d: 'If you’re yelling most days or your temper feels like it’s running you: your doctor, a counsellor or anger-management group, and the Calm-Down Kit. Getting help is a strong, loving thing to do.', k: 'Guide' };
  EXTRA['/work.html#owner-list'] = { u: '/work.html#owner-list', t: 'Team one-owner list (at work, or with a business partner)', d: 'Every recurring job gets one owner and one backup, with a “who carries what” tally. For co-founders, co-owners and teams. Kept on this device.', k: 'Tool' };
  EXTRA['/work.html#neurodiversity'] = { u: '/work.html#neurodiversity', t: 'At work: ADHD, autism and neurodiversity', d: 'Written asks after meetings, one ask per message, protected focus time, and asking how people work best. Plain, direct words that help everyone.', k: 'Guide' };
  EXTRA['/turning-toward-in-depth.html#their-world'] = { u: '/turning-toward-in-depth.html#their-world', t: 'Questions to ask each other: know their world', d: '“What’s on your mind this week that I don’t know about?” Small questions that keep you up to date with each other, and how to really listen to the answer.', k: 'Guide' };
  EXTRA['#print'] = { u: '#print', t: 'Print this page', d: 'Prints the page you’re on. On any guide, “Share this guide” also has “Print this page”, or press Ctrl+P (⌘P on a Mac). Worksheets and the chore chart have their own Print buttons.', k: 'Print' };
  // pages that are newly written: if the search index was built before a page existed, its result still shows
  var FRESH = {
    '/friends.html': ['Friends: when a friendship drifts', 'When you’re always the one reaching out, a friend never texts back, or life changes pull you apart: kind words to say, and low-energy ways to stay close.'],
    '/more-than-two.html': ['More than two partners at home', 'For polyamorous families, triads and throuples: sharing the load between three or more, and joining a home without feeling like a guest.'],
    '/gaming-and-time-together.html': ['Gaming, phones and time together', 'When one of you games or scrolls all night: a calm talk with no blame, and a small “time together deal” to fill in.'],
    '/money-together.html': ['Money together', 'Saver and spender, moving in together, wedding costs and family expectations, and how to tell normal limits from control.'],
    '/foster-and-kinship.html': ['Foster, adoptive and kinship families', 'For foster carers, adoptive parents and grandparents raising grandchildren: sharing the load, the social worker, and the children’s own story.'],
    '/adhd-kids.html': ['When a child has ADHD', 'For parents and grandparents: routines that help, what to say when they can’t sit still or forget everything, and looking after yourselves.'],
    '/grown-up-children.html': ['Grown-up children and parents', 'Boundaries with a parent you love: visits, drop-ins, unsolicited advice and the new baby, with words you could use.'],
    '/coming-home.html': ['Coming home after time apart', 'After deployment, work away or a hospital stay: a handover week, finding your place again, and where to get support.'],
    '/different-hours.html': ['Different hours', 'Night shifts, shift work and opposite schedules, or one of you works from home and seems always available.'],
    '/two-faiths.html': ['Two faiths, one family', 'Two faiths or cultures under one roof: holidays, naming and blessing a baby, family expectations, and what to tell the children.'],
    '/coming-out.html': ['Coming out as an adult', 'Coming out to family, at work or with a partner: going at your pace, words you could use, and places to get support.'],
    '/on-my-own.html': ['On my own after a breakup or divorce', 'Building a life again, and part-time parenting when the kids are with you some days.'],
    '/for-counselors.html': ['For counsellors, coaches and group leaders', 'How to use these free pages and tools with clients and groups.'],
    '/sharing-a-room.html': ['Sharing a room (dorm or flat)', 'A room agreement to fill in together: guests, quiet hours, sleep and cleaning, and how to raise it kindly.'],
    '/empty-nest.html': ['When the kids have left home', 'An empty nest and a quiet house: finding each other again when you feel like roommates.'],
    '/family-rifts.html': ['Family rifts and estrangement', 'Adult brothers and sisters, a will, a favourite child, years of silence: reaching out, or deciding you’re not ready.'],
    '/when-one-is-ill.html': ['When one of you is ill', 'Chronic illness, disability, long Covid or ME/CFS: sharing the load when one of you has fewer spoons, without either of you feeling a burden.']
  };
  var TOOL_URL = /^\/(safety|upset-right-now|surprise|install|conversation-reader|carrier-wave-decoder|signal-translator|lemonade-stand|wiring-card|quick-checks|ask|night-garden|calm-visualizer|soundscapes|pause-and-play|word-bloom|quiet-words|quiet-crossword|daily-ledger-crossword|frequency-journey|start-in-10-minutes|on-this-device)\.html$|^\/workpapers\/(wp-|calculators|fill)|^\/wp-11\.html$|^\/tools\//;

  // the words the site uses, with how often, for "Did you mean"
  var REAL = null, indexed = {};
  function prepSearch(list) {
    vocab = {}; indexed = {};
    // everyday English and Spanish words that aren't on the site (built by tools/search/build_index.py):
    // one of these is searched as typed, never "corrected" into a site word ("gaming" isn't "naming")
    REAL = {};
    String((window.TOL_SEARCH && window.TOL_SEARCH.w) || '').split(' ').forEach(function (w) { if (w) REAL[w] = 1; });
    list.forEach(function (p) {
      indexed[p.u] = 1;
      p.t = String(p.t || '').replace(/\s*[·|–—-]\s*Spread Love (&|&amp;|and) Acceptance\s*$/i, '');
      var strong = fold(p.t + ' ' + (p.h || '') + ' ' + (p.s || []).join(' ') + ' ' + (p.d || '')), weak = fold(p.x || '');
      strong.split(/[^a-z0-9'-]+/).forEach(function (w) { if (w.length > 2) vocab[w] = (vocab[w] || 0) + 5; });
      weak.split(/[^a-z0-9'-]+/).forEach(function (w) { if (w.length > 2) vocab[w] = (vocab[w] || 0) + 1; });
      p._title = fold(p.t + ' ' + (p.h || '')); p._heads = fold((p.s || []).join(' · ')); p._desc = fold(p.d); p._text = weak;
    });
    Object.keys(SLIPS).forEach(function (k) { if (vocab[k] && k !== SLIPS[k]) delete vocab[k]; });
  }
  // Damerau-Levenshtein, stopping early once it's past the limit
  function editDist(a, b, max) {
    if (Math.abs(a.length - b.length) > max) return max + 1;
    var d = [], i, j;
    for (i = 0; i <= a.length; i++) { d[i] = [i]; }
    for (j = 0; j <= b.length; j++) d[0][j] = j;
    for (i = 1; i <= a.length; i++) {
      var best = 1e9;
      for (j = 1; j <= b.length; j++) {
        var c = a[i - 1] === b[j - 1] ? 0 : 1;
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + c);
        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
        if (d[i][j] < best) best = d[i][j];
      }
      if (best > max) return max + 1;
    }
    return d[a.length][b.length];
  }
  // a rough sound-alike key (Soundex)
  function sound(w) {
    var codes = { b: 1, f: 1, p: 1, v: 1, c: 2, g: 2, j: 2, k: 2, q: 2, s: 2, x: 2, z: 2, d: 3, t: 3, l: 4, m: 5, n: 5, r: 6 };
    w = w.replace(/[^a-z]/g, ''); if (!w) return '';
    var out = w[0], last = codes[w[0]] || 0;
    for (var i = 1; i < w.length && out.length < 4; i++) { var c = codes[w[i]] || 0; if (c && c !== last) out += c; if (w[i] !== 'h' && w[i] !== 'w') last = c; }
    return (out + '000').slice(0, 4);
  }
  function known(t) {
    if (!vocab) return true;
    if (vocab[t] || ACT[t] || SAME[t]) return true;
    if (t.length >= 3) for (var w in vocab) if (w.indexOf(t) === 0) return true;
    return realWord(t);
  }
  // a real word, or a plain form of one: twins → twin, gaming → game, fidgeting → fidget, spender → spend
  function realWord(t) {
    if (!REAL) return false;
    function ok(w) { return w.length > 2 && !!(REAL[w] || (vocab && vocab[w]) || ACT[w]); }
    if (ok(t)) return true;
    var ends = [[/'s$/, ''], [/s$/, ''], [/es$/, ''], [/ies$/, 'y'], [/ed$/, ''], [/ed$/, 'e'], [/d$/, ''], [/ing$/, ''], [/ing$/, 'e'], [/(.)\1(ing|ed|er|est)$/, '$1'],
      [/er$/, ''], [/er$/, 'e'], [/ers$/, ''], [/ers$/, 'e'], [/ier$/, 'y'], [/iest$/, 'y'], [/est$/, ''], [/ly$/, ''], [/ily$/, 'y'], [/ness$/, ''], [/ful$/, ''], [/less$/, ''], [/ment$/, ''], [/able$/, ''], [/able$/, 'e'], [/ings$/, ''], [/ings$/, 'e']];
    return ends.some(function (e) { var w = t.replace(e[0], e[1]); return w !== t && ok(w); });
  }
  // a spelling fix: only for a word that isn't a word at all (not on the site, not everyday English or Spanish)
  function correct(t) {
    if (SLIPS[t] && SLIPS[t] !== t) return SLIPS[t];
    // three letters is too short to guess from ("nan" isn't "can"): those only get "Did you mean" if nothing matches
    if (/\d/.test(t) || t.length < 4 || known(t)) return null;
    return nearest(t);
  }
  // the nearest site word, used for "Did you mean" when even a real word finds nothing
  function nearest(t) {
    if (/\d/.test(t) || t.length < 3 || !vocab) return null;
    var max = t.length <= 4 ? 1 : 2, st = sound(t), best = null, bestScore = -1e9;
    for (var w in vocab) {
      if (Math.abs(w.length - t.length) > max) continue;
      var dist = editDist(t, w, max); if (dist > max) continue;
      var score = -dist * 10 + (sound(w) === st ? 6 : 0) + (w[0] === t[0] ? 3 : 0) + Math.min(6, Math.log(vocab[w] + 1) * 1.5);
      if (score > bestScore) { bestScore = score; best = w; }
    }
    return best;
  }
  // how well one word matches a piece of text: the whole word (or its start) counts fully, the middle of
  // another word ("static" inside "allostatic") only a little
  function hitIn(text, t) {
    var at = text.indexOf(t); if (at === -1) return 0;
    // a short word only counts as itself: "he" isn't in "here", "ex" isn't in "next"
    if (t.length <= 3) return new RegExp('(^|[^a-z0-9])' + reEsc(t) + '(s|es)?($|[^a-z0-9])').test(text) ? 1 : 0;
    return new RegExp('(^|[^a-z0-9])' + reEsc(t)).test(text) ? 1 : 0.25;
  }
  function termScore(p, t) {
    var s = 0, h;
    if ((h = hitIn(p._title, t))) s += (12 + (new RegExp('(^|[^a-z0-9])' + reEsc(t) + '($|[^a-z0-9])').test(p._title) ? 8 : 0)) * h;
    if ((h = hitIn(p._heads, t))) s += 5 * h;
    if ((h = hitIn(p._desc, t))) s += 3 * h;
    if ((h = hitIn(p._text, t))) s += (1 + Math.min(3, p._text.split(t).length - 2)) * h;
    return s;
  }
  function searchPages(list, q, termsIn) {
    var terms = termsIn || searchTerms(q);
    if (!terms.length) return [];
    var out = [], boost = {};
    terms.forEach(function (t) {
      var a = actFor(t) || (t.length > 4 && /s$/.test(t) && actFor(t.slice(0, -1)));
      if (a) a.forEach(function (u, i) { boost[u] = Math.max(boost[u] || 0, 60 - i * 6); });
    });
    // a situation word (from a phrase like "my ex" or "games all night") points to pages; it isn't in their text
    var need = terms.filter(function (t) { return !(actFor(t) && !(vocab && vocab[t])); }).length;
    list.forEach(function (p) {
      var score = 0, hits = 0;
      terms.forEach(function (t) {
        var alts = [t].concat(SAME[t] || []);
        if (t.length > 4 && /s$/.test(t)) alts.push(t.slice(0, -1));
        var s = 0; alts.forEach(function (a, i) { s = Math.max(s, termScore(p, a) * (i ? 0.7 : 1)); });
        if (s && !(actFor(t) && !(vocab && vocab[t]))) hits++;
        score += s;
      });
      var b = boost[p.u] || 0;
      // the site's own pages about itself only show when asked for: the logo page, and the policies (refunds, terms)
      if (/^\/brand\.html$/.test(p.u) && !terms.some(function (t) { return /^(brand|branding|logo|logos|colou?rs?|palette|fonts?|typeface|mascot)$/.test(t); })) return;
      if (/^\/legal\/(refund|terms)/.test(p.u) && !terms.some(function (t) { return /^(refunds?|terms|legal|cancel|cancell?ation|cancelling|canceling|subscriptions?|membership|charged?|charges|payment|billing|conditions|policy|policies)$/.test(t); })) return;
      if (!b && hits < need) return;                  // every word has to be there, unless it's a helpful tool
      if (b && TOOL_URL.test(p.u)) b += 10;
      score += b;
      // the simple page comes before its in-depth twin: most people want the short way in first
      if (score) out.push({ p: p, score: score - (p.f ? 2 : 0) - (/-in-depth\.html/.test(p.u) ? 10 : 0) - (/^\/(telemetry|suite-index|roadmap|architecture|legal\/)/.test(p.u) ? 15 : 0) + (TOOL_URL.test(p.u) && score > 8 ? 3 : 0) });
    });
    Object.keys(EXTRA).forEach(function (u) { if (boost[u]) out.push({ p: EXTRA[u], score: boost[u] + 20 }); });
    // a newly written page that the index doesn't have yet still shows, from its line in FRESH
    Object.keys(FRESH).forEach(function (u) { if (boost[u] && !indexed[u]) out.push({ p: { u: u, t: FRESH[u][0], d: FRESH[u][1], x: '' }, score: boost[u] + 20 }); });
    return out.sort(function (a, b) { return b.score - a.score; }).slice(0, 25);
  }
  function snippet(p, terms) {
    var src = p.x || p.d || '', low = fold(src), at = -1;
    terms.some(function (t) { var m = new RegExp('(^|[^a-z0-9])' + reEsc(t)).exec(low); at = m ? m.index + m[1].length : low.indexOf(t); return at !== -1; });
    if (at === -1) return p.d || cut(src, 0, 150);
    return cut(src, Math.max(0, at - 60), at + 110);
  }
  // cut at whole words, with a "…" where it was cut
  function cut(src, from, to) {
    if (from > 0) { var sp = src.indexOf(' ', from); from = sp === -1 || sp > from + 25 ? from : sp + 1; }
    if (to < src.length) { var sp2 = src.lastIndexOf(' ', to); if (sp2 > from + 40) to = sp2; }
    return (from > 0 ? '…' : '') + src.slice(from, to).trim() + (to < src.length ? '…' : '');
  }
  function markTerms(text, terms) {
    var h = esc(text);
    terms.forEach(function (t) { if (t.length > 1) h = h.replace(new RegExp('(^|[^a-z0-9&;])(' + reEsc(t) + ')', 'ig'), '$1<mark>$2</mark>'); });
    return h;
  }
  function smartSearch(data, q) {
    var terms = searchTerms(q), fixed = terms.map(function (t) { return correct(t) || t; }), changed = fixed.join(' ') !== terms.join(' ');
    var hits = searchPages(data, q, terms), used = terms, auto = false;
    if (changed) {
      var better = searchPages(data, q, fixed);
      // nothing (or very little) for the words as typed: show the corrected search straight away
      if (!hits.length || (better.length && better[0].score > (hits[0] ? hits[0].score * 1.5 : 0))) { hits = better; used = fixed; auto = true; }
    } else if (!hits.length) {
      // real words that find nothing: search them as typed, and only offer the nearest site word as "Did you mean"
      var near = terms.map(function (t) { return (!actFor(t) && nearest(t)) || t; });
      if (near.join(' ') !== terms.join(' ') && searchPages(data, q, near).length) { fixed = near; changed = true; }
    }
    // what to show and offer: the words as typed, with only the changed ones swapped
    var said = fold(q).trim();
    terms.forEach(function (t, i) { if (fixed[i] !== t) said = said.replace(new RegExp('(^|[^a-z0-9])' + reEsc(t) + '(?![a-z0-9])'), '$1' + fixed[i]); });
    return { hits: hits, used: used, fixed: fixed, changed: changed, auto: auto, said: said };
  }
  var runSearch = function () {};
  // Leave quickly: any [data-tol-exit] button, or Esc pressed twice, swaps this tab for a weather search
  // (location.replace, so Back doesn't return here). Linked from the safety page, the menu and safety notes.
  // it also forgets the chat and the pages remembered for "Pick up where you left off", so nothing shows on a shared device afterwards
  function quickExit() { try { sessionStorage.removeItem('tol-chat-v1'); localStorage.removeItem('tol-recent'); } catch (e) {} location.replace('https://www.google.com/search?q=weather+today'); }
  document.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('[data-tol-exit]'); if (b) { e.preventDefault(); quickExit(); } });
  (function () {
    var last = 0, GAME = /^\/(frequency-journey(-play)?|bears-dojo|night-garden|pause-and-play|word-bloom|quiet-words|quiet-crossword|daily-ledger-crossword|re-check-drive|calm-visualizer|soundscapes)\.html$/;
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape' || GAME.test(location.pathname) || document.fullscreenElement) return;
      // an Esc that closes a menu, dialog or clears a box doesn't count, so closing things never sends anyone away
      var ae = document.activeElement || {};
      // (an open dropdown or menu button, anything aria-expanded, counts as something this Esc is closing)
      if (Array.prototype.some.call(document.querySelectorAll('[role="dialog"]:not([hidden]), [aria-modal="true"]:not([hidden]), dialog[open], [aria-expanded="true"]'), function (d) { return d.getClientRects().length > 0; }) || /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName || '') || ae.isContentEditable) { last = 0; return; }
      var now = Date.now();
      if (now - last < 700) quickExit();
      last = now;
    }, true);
  })();
  function buildSearch() {
    var box = el('div', { class: 'tol-find', role: 'search' },
      '<label for="tol-find-q">Search the site</label>' +
      '<input id="tol-find-q" type="search" autocomplete="off" spellcheck="true" enterkeyhint="search" placeholder="A word or two, like “chores” or “calm down”" aria-describedby="tol-find-note">' +
      '<p class="tol-find-note" id="tol-find-note" aria-live="polite">Searches every page, on your device. Spelling can be rough.</p>' +
      '<ol class="tol-find-results" hidden></ol>');
    var input = box.querySelector('input'), note = box.querySelector('.tol-find-note'), list = box.querySelector('.tol-find-results'), timer = null;
    var shownFor = null;   // the words the list on screen is for
    runSearch = function (q, then) {
      q = String(q || '').trim();
      var idx = panel && panel.querySelector('.tol-index');
      if (!q) { shownFor = null; list.hidden = true; list.innerHTML = ''; note.textContent = 'Searches every page, on your device. Spelling can be rough.'; if (idx) idx.hidden = false; return; }
      loadSearch(function (data) {
        if (input.value.trim() !== q) return;
        if (!data) { note.textContent = 'Search isn’t available just now. The full list of pages is below.'; if (idx) idx.hidden = false; return; }
        var R;
        try { R = smartSearch(data, q); } catch (err) {
          // never a blank box: say so, and keep the full list of pages in view
          if (window.console) console.warn('search:', err);
          shownFor = null; list.hidden = true; list.innerHTML = ''; if (idx) idx.hidden = false;
          note.textContent = 'Search had a hiccup with “' + q + '”. Try another word, or browse the sections below.';
          return;
        }
        var hits = R.hits, used = R.used, fixed = R.fixed, changed = R.changed, auto = R.auto;
        if (idx) idx.hidden = !!hits.length;
        list.hidden = !hits.length;
        list.innerHTML = hits.map(function (h) {
          var p = h.p, act = p.u.charAt(0) === '#';
          var kind = act ? p.k : TOOL_URL.test(p.u) ? 'Tool' : '';
          return '<li><a href="' + esc(act ? '#' : p.u) + '"' + (act ? ' data-find-act="' + esc(p.u.slice(1)) + '"' : '') + '><span class="tol-find-t">' + markTerms(p.t, used) +
            (kind ? ' <small class="tol-find-kind">' + esc(kind) + '</small>' : '') + (p.f ? ' <small>Full version</small>' : '') + '</span>' +
            '<span class="tol-find-s">' + markTerms(act ? p.d : snippet(p, used), used) + '</span></a></li>';
        }).join('');
        var said = '“' + (auto ? R.said : q) + '”';
        var head = hits.length ? (hits.length === 25 ? 'The 25 best matches for ' + said + '.' : hits.length + (hits.length === 1 ? ' result for ' : ' results for ') + said + '.')
          : 'Nothing matches “' + q + '” yet. Try a shorter or different word, browse the sections below, or ask Professor Puddles in your own words.';
        note.innerHTML = '';
        if (auto) note.appendChild(document.createTextNode('Showing results for “' + R.said + '” (you typed “' + q + '”). '));
        note.appendChild(document.createTextNode(auto ? (hits.length === 25 ? 'The 25 best matches.' : hits.length + (hits.length === 1 ? ' result.' : ' results.')) : head));
        if (!hits.length || hits.length < 3) { note.appendChild(document.createTextNode(' ')); note.appendChild(el('a', { href: '/ask.html', class: 'tol-find-ask' }, 'Ask Professor Puddles')); }
        if (changed && !auto) {
          var dym = el('button', { type: 'button', class: 'tol-find-dym' }, 'Did you mean “' + esc(R.said) + '”?');
          dym.addEventListener('click', function () { input.value = R.said; runSearch(input.value); input.focus(); });
          note.appendChild(document.createTextNode(' ')); note.appendChild(dym);
        }
        shownFor = q;
        if (then) then();
      });
    };
    list.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('[data-find-act]'); if (!a) return;
      e.preventDefault();
      var what = a.getAttribute('data-find-act');
      closePanel();
      if (what === 'breathe') { var b = document.querySelector('.tol-breathe-btn'); if (b) b.click(); }
      if (what === 'settings') openSettings();
      if (what === 'palcam' && window.TOLPalCam) window.TOLPalCam.open({});
      if (what === 'print') setTimeout(function () { window.print(); }, 150);
    });
    input.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(function () { runSearch(input.value); }, 140); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        // typed fast and pressed Enter before the list caught up: search now, then go to the first result
        var go = function () { var first = list.querySelector('a'); if (first) first.focus(); };
        if (shownFor !== input.value.trim()) { clearTimeout(timer); runSearch(input.value, go); } else go();
      }
      // Escape clears the box and, in the menu or search panel, closes it too: one press is enough
      if (e.key === 'Escape' && input.value) { input.value = ''; runSearch(''); }
    });
    return box;
  }
  // for other pages (the 404 page, the glossary): TOLSearch.find('words', function (pages, fixedWords) {...})
  window.TOLSearch = { load: loadSearch, correct: function (w) { return correct(fold(w)) || null; },
    find: function (q, cb) { loadSearch(function (d) { if (!d) return cb([], q); var R; try { R = smartSearch(d, q); } catch (err) { return cb([], q); } cb(R.hits.map(function (x) { return x.p; }), R.used.join(' ')); }); } };

  // ---------- "Chapter N of 6": where you are in the book, with every chapter one tap away ----------
  function isChapter(it) { return /^\/book\/(self-\d-[a-z]+|preface|chapter-\d)\.html$/.test(it.href); }
  function isSelfPart(it) { return /^\/book\/self-/.test(it.href); }
  function buildChapterBar() {
    if (!here || !isChapter(here)) return;
    var main = document.querySelector('main'); if (!main) return;
    var book = SECTIONS.filter(function (x) { return x.id === 'book'; })[0].items.filter(isChapter);
    var at = book.indexOf(here); if (at < 0) return;
    var nav = el('nav', { class: 'tol-chbar no-bubble', 'aria-label': 'Chapters of the book' });
    var items = book.map(function (it, i) {
      var name = it.code === 'Preface' ? 'Preface' : isSelfPart(it) ? 'Part One, ' + it.code : 'Chapter ' + it.code;
      var href = inDepth && it.deep ? deepHref(it) : it.href;
      return '<li' + (it.code === 'Preface' ? ' class="is-part2"' : isSelfPart(it) ? ' class="is-part1"' : '') + '><a href="' + href + '"' + (i === at ? ' aria-current="page"' : '') + ' title="' + esc(name + ': ' + it.title) + '">' +
        '<span aria-hidden="true">' + (it.code === 'Preface' ? 'P' : esc(it.code)) + '</span><span class="sr-only">' + esc(name + ': ' + it.title) + '</span></a></li>';
    }).join('');
    // the book's own way of counting: Part One (Then, Now, Next), then the Preface and Chapters I to V
    var last = book[book.length - 1].code;
    nav.innerHTML = '<p class="tol-chbar-k">' + (isSelfPart(here) ? 'Part One: ' + esc(here.code) + '<span> · yourself</span>' : here.code === 'Preface' ? 'The Preface<span> · before Chapter I</span>' : 'Chapter ' + esc(here.code) + ' <span>of ' + esc(last) + '</span>') + '</p><ol>' + items + '</ol>' +
      '<p class="tol-chbar-nav">' + (at > 0 ? '<a href="' + (inDepth && book[at - 1].deep ? deepHref(book[at - 1]) : book[at - 1].href) + '" rel="prev">&larr; Previous</a>' : '') +
      (at < book.length - 1 ? '<a href="' + (inDepth && book[at + 1].deep ? deepHref(book[at + 1]) : book[at + 1].href) + '" rel="next">Next &rarr;</a>' : '<a href="/prog-01.html">Next: six gentle weeks &rarr;</a>') + '</p>';
    var head = main.querySelector('.read-head');
    if (head) head.appendChild(nav); else main.insertBefore(nav, main.firstChild);
  }

  // ---------- Breathe with me ----------
  // Six slow breaths, in for 4 seconds and out for 6 (about six a minute). Nothing is saved.
  // ---------- One garden for the whole site ----------
  // Finishing a breathing session, a word puzzle, a Turning Toward day or a weather check-in
  // plants a flower in the Night Garden, which blooms on the next visit. Kept in this browser.
  window.TOLGarden = {
    gift: function (source) {
      var g = { count: 0, from: {} };
      try { g = JSON.parse(lsGet('tol-garden-gifts') || '') || g; } catch (e) {}
      g.count = Math.min(24, (g.count || 0) + 1); g.from = g.from || {}; g.from[source] = (g.from[source] || 0) + 1;
      lsSet('tol-garden-gifts', JSON.stringify(g));
      if (current !== '/night-garden.html') plantedNote();
    }
  };
  function plantedNote() {
    var n = el('a', { class: 'tol-planted', href: '/night-garden.html', role: 'status' }, '<span aria-hidden="true">&#127800;</span> A flower was planted in your Night Garden');
    document.body.appendChild(n);
    requestAnimationFrame(function () { n.classList.add('is-in'); });
    setTimeout(function () { n.classList.remove('is-in'); setTimeout(function () { n.remove(); }, 600); }, 4200);
  }

  // ---------- Things drift softly into place as you scroll to them ----------
  function revealOnScroll() {
    if (!('IntersectionObserver' in window) || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) return;
    var items = document.querySelectorAll('main .ideas > li, main .scene, main .try-this, main .tol-tip, main .tt-card, main .tt-week-wrap, main .track-card, main .live-card, main .off-list li, main .tol-welcome');
    if (!items.length) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target, delay = +(el.getAttribute('data-reveal-i') || 0) % 4 * 90;
        setTimeout(function () { el.classList.add('is-in'); }, delay);
        io.unobserve(el);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    Array.prototype.forEach.call(items, function (el, i) {
      // anything already on screen when the page opens just appears, so nothing flickers
      var r = el.getBoundingClientRect(); if (r.top < window.innerHeight * 0.9) return;
      el.setAttribute('data-reveal-i', i); el.classList.add('tol-reveal'); io.observe(el);
    });
  }

  // ---------- Little tips for the day ----------
  // One small, practical tip near the end of each content page. It changes each day, differs
  // from page to page, and "Another tip" shows a new one.
  var TIPS = [
    ['Name the feeling.', 'Saying “I’m frustrated” out loud, or just in your head, takes some of the heat out of it.'],
    ['Three breaths before you reply.', 'When a message stings, wait three slow breaths before answering. Your reply will likely be kinder, and so will the one you get back.'],
    ['Check the basics first.', 'Snapping at everyone? Ask yourself: am I hungry, thirsty, lonely or tired? Fix that first, then decide if the problem is still a problem.'],
    ['Five minutes of daylight.', 'Step outside for a few minutes, especially in the morning. Daylight helps you wake up and can lift your mood.'],
    ['Write tomorrow’s top three tonight.', 'Putting tomorrow’s to-dos on paper before bed helps your mind let go of them.'],
    ['Start with what’s going well.', 'Before a hard conversation, say one thing you appreciate. It helps the other person hear the rest.'],
    ['Try “Can you help me with…?”', 'It lands much more softly than “You never…,” and it asks for something they can actually do.'],
    ['The two-minute rule.', 'If a job takes less than two minutes, do it now. Small things stop piling up.'],
    ['Phone in another room.', 'For the first ten minutes after you get home, leave your phone somewhere else and say hello properly.'],
    ['Ask about good news.', 'When someone shares something good, ask one question about it. It’s one of the simplest ways to feel closer.'],
    ['Drop your shoulders.', 'Right now: let your shoulders fall away from your ears and unclench your jaw. Check again in an hour.'],
    ['A ten-minute walk.', 'A short walk, even around the block, can lift your mood and clear your head.'],
    ['Rest your eyes.', 'Every twenty minutes of screen time, look at something far away for twenty seconds.'],
    ['Park a looping worry.', 'If a worry keeps circling, write it down with one small next step. Then let the paper hold it.'],
    ['Say one small thank-you.', 'Thank someone today for something tiny and specific. It costs nothing and it’s remembered.'],
    ['Three things that went okay.', 'Before sleep, name three things that went okay today. Small things count. It trains your attention toward the good.'],
    ['Breathe out longer.', 'When you feel wound up, make each breath out a little longer than the breath in. It tells your body it’s safe.'],
    ['Send a “thinking of you” text.', 'Text someone you care about. No reason needed, no reply expected. It takes ten seconds.'],
    ['Decide one thing you won’t do today.', 'Protecting your energy is easier when you choose in advance what can wait.'],
    ['Give yourself a doorway minute.', 'Between work mode and home mode, take a minute or two to switch: a song, a short walk, a cup of tea.'],
    ['Shrink the task.', 'Overwhelmed? Ask: what’s the very next physical step? Do only that.'],
    ['Help or an ear?', 'Before giving advice, ask: “Do you want help, or do you just want me to listen?”'],
    ['Cool water, calm body.', 'When feelings run high, splash some cool water on your face. It can help you feel steadier.'],
    ['Book the worry.', 'Set aside ten minutes for a worry later today, instead of letting it follow you around all day.'],
    ['Name a time to come back.', 'If a talk gets too hot, say “I need a minute. Can we come back at 8?” A pause with a time is not walking away.'],
    ['Five things you can see.', 'Feeling scattered? Name five things you can see right now. It pulls you back into the present.'],
    ['Laugh together.', 'Sharing a laugh, even at something silly, is a small repair after a tense day.'],
    ['Short sleep, gentle day.', 'After a poor night, go easy on big decisions and hard talks. Your battery really is lower.'],
    ['Lower your voice.', 'When things heat up, speak a little softer and slower. People tend to match the tone they hear.'],
    ['Make it easy to do.', 'Put what you need where you’ll see it: the book on your pillow, the water bottle on your desk.'],
    ['Take one thing off the list.', 'On purpose. A lighter day is still a good day.'],
    ['Drink some water.', 'Even mild thirst can make you feel tired and irritable. Have a glass before your next coffee.'],
    ['Assume a good reason.', 'When someone is short with you, try assuming they’re having a hard day before assuming they mean it.'],
    ['Celebrate small wins.', 'Finished something? Pause for a second and notice it before rushing on.'],
    ['One kind word to yourself.', 'Talk to yourself the way you’d talk to a friend who’s having a rough day.'],
    ['Stretch for a minute.', 'Stand up, reach for the ceiling, roll your neck. Your body often holds on to stress your mind has moved past.'],
    ['Say what you need, not what they did wrong.', '“I need ten quiet minutes” gets a better answer than “You’re so loud.”'],
    ['Put a pause before “yes.”', 'Try “Let me check and get back to you.” It keeps you from saying yes to too much.'],
    ['Hug a little longer.', 'A slow six-second hug helps both of you settle.'],
    ['Leave it better than you found it.', 'Tidy one small spot before you leave a room. Tomorrow’s you will be grateful.']
  ];
  var NO_TIPS = ['/index.html', '/night-garden.html', '/dashboard.html', '/404.html', '/offline.html', '/pursue-withdraw.html', '/upset-right-now.html', '/safety.html', '/sent-this.html'];
  // The full library (about 300 tips in topics) lives in tips.js and loads when a tip is shown;
  // the short list above is the fallback. Pages lean toward topics that fit them.
  var TIP_TOPICS = {
    self: ['calm', 'body', 'mind', 'selftalk', 'rest', 'sleep'], relationships: ['connection', 'talking', 'family', 'friends', 'kindness'],
    book: ['connection', 'talking', 'home', 'kindness'], workpapers: ['home', 'talking', 'work', 'connection'], program: ['home', 'talking', 'work'],
    tools: ['focus', 'calm', 'talking', 'mind'], media: ['rest', 'calm', 'outdoors', 'sleep'], start: null, about: null
  };
  var tipLib = null, tipWaiting = [];
  window.TOLTips = {
    // cb([title, body, topicLabel]) with a tip from the library, preferring the given topics
    get: function (topics, cb, seed) {
      function pick() {
        var L = tipLib, list = L.tips, pool = topics ? list.filter(function (t) { return topics.indexOf(t[0]) !== -1; }) : list;
        if (!pool.length || (topics && Math.random() < 0.25 && seed == null)) pool = list;
        var t = pool[seed != null ? seed % pool.length : Math.floor(Math.random() * pool.length)];
        cb([t[1], t[2], L.cats[t[0]] || '']);
      }
      if (tipLib) return pick();
      tipWaiting.push(pick);
      if (tipWaiting.length > 1) return;
      var sc = document.createElement('script'); sc.src = '/assets/js/tips.js';
      sc.onload = function () { tipLib = window.TOL_TIPS && window.TOL_TIPS.tips && window.TOL_TIPS.tips.length ? window.TOL_TIPS : { cats: {}, tips: TIPS.map(function (x) { return ['', x[0], x[1]]; }) }; var w = tipWaiting; tipWaiting = []; w.forEach(function (f) { f(); }); };
      sc.onerror = function () { tipLib = { cats: {}, tips: TIPS.map(function (x) { return ['', x[0], x[1]]; }) }; var w = tipWaiting; tipWaiting = []; w.forEach(function (f) { f(); }); };
      document.head.appendChild(sc);
    }
  };
  function addTip(body) {
    if (body.hasAttribute('data-no-tip') || NO_TIPS.indexOf(current) !== -1 || /^\/legal\//.test(current)) return;
    var main = document.querySelector('main'); if (!main) return;
    var d = new Date(), seed = d.getFullYear() * 400 + d.getMonth() * 32 + d.getDate();
    for (var i = 0; i < current.length; i++) seed = (seed * 31 + current.charCodeAt(i)) % 100003;
    var sec = body.getAttribute('data-sec'), topics = TIP_TOPICS[sec] || null;
    var card = el('aside', { class: 'tol-tip', 'aria-label': 'A little tip for today' },
      '<img src="/assets/img/mascots/bubble-buddy.svg" alt="" width="52" height="52">' +
      '<div><p class="tol-tip-k">Little tip for today<span class="tol-tip-topic"></span></p><p class="tol-tip-h"></p><p class="tol-tip-b"></p>' +
      '<button type="button" class="tol-tip-next">Another tip</button></div>');
    function show(t) {
      card.querySelector('.tol-tip-h').textContent = t[0]; card.querySelector('.tol-tip-b').textContent = t[1];
      card.querySelector('.tol-tip-topic').textContent = t[2] ? ' · ' + t[2] : '';
    }
    var first = TIPS[seed % TIPS.length]; show([first[0], first[1], '']);   // shows at once, then the library takes over
    window.TOLTips.get(topics, show, seed);
    card.querySelector('.tol-tip-next').addEventListener('click', function () {
      var tip = card.querySelector('.tol-tip-h');
      tip.parentNode.classList.add('is-swap');
      setTimeout(function () { window.TOLTips.get(topics, function (t) { show(t); tip.parentNode.classList.remove('is-swap'); }); }, 220);
    });
    main.appendChild(card);
  }

  // ---------- "What you type stays on your device" ----------
  // Shown at the top of any page where people type or tick things that stay in the browser.
  // Never on pages that do send what's typed: sign-ups, the report form, the dashboard.
  var SENDS = ['/index.html', '/404.html', '/membership.html', '/dashboard.html'];
  function addPrivateNote(body) {
    if (body.hasAttribute('data-no-private-note') || SENDS.indexOf(current) !== -1) return;
    var main = document.querySelector('main') || body;
    var fields = Array.prototype.filter.call(main.querySelectorAll('textarea, select, input'), function (f) {
      var t = (f.getAttribute('type') || 'text').toLowerCase();
      return ['email', 'hidden', 'submit', 'button', 'password'].indexOf(t) === -1 && !f.closest('.tol-gate, form[action]');
    });
    if (!fields.length && !body.hasAttribute('data-private-note')) return;
    if (/Private by design|What you type stays on this device/i.test(main.textContent || '')) return; // the page already says so
    var note = el('p', { class: 'tol-private' },
      '<span aria-hidden="true">&#128274;</span><span><strong>Private by design.</strong> What you type or choose on this page stays on your device. It is never sent to us. ' +
      '<a href="/legal/privacy-policy.html#your-entries">More</a></span>');
    var head = main.querySelector('.read-head');
    if (head && head.parentNode) head.parentNode.insertBefore(note, head.nextSibling);
    else main.insertBefore(note, main.firstChild);
  }

  // ---------- The site as an app ----------
  // Icons, the manifest and the offline helper, added here so every page gets them.
  function addAppMeta() {
    var h = document.head; if (!h) return;
    function add(tag, attrs) { var n = document.createElement(tag); for (var k in attrs) n.setAttribute(k, attrs[k]); h.appendChild(n); }
    if (!h.querySelector('link[rel="manifest"]')) add('link', { rel: 'manifest', href: '/manifest.webmanifest' });
    if (!h.querySelector('link[rel~="icon"]')) {
      add('link', { rel: 'icon', href: '/assets/icons/icon.svg', type: 'image/svg+xml' });
      add('link', { rel: 'alternate icon', href: '/assets/icons/favicon-32.png', type: 'image/png', sizes: '32x32' });
      add('link', { rel: 'alternate icon', href: '/assets/icons/favicon-16.png', type: 'image/png', sizes: '16x16' });
    }
    if (!h.querySelector('link[rel="apple-touch-icon"]')) add('link', { rel: 'apple-touch-icon', href: '/assets/icons/apple-touch-icon-180.png', sizes: '180x180' });
    if (!h.querySelector('meta[name="theme-color"]')) add('meta', { name: 'theme-color', content: '#F5EFDE' });
    add('meta', { name: 'apple-mobile-web-app-capable', content: 'yes' });
    add('meta', { name: 'mobile-web-app-capable', content: 'yes' });
    add('meta', { name: 'apple-mobile-web-app-title', content: 'The Ledger' });
    if (isApp()) document.documentElement.classList.add('tol-app');
    if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
      window.addEventListener('load', function () {
        navigator.serviceWorker.register('/sw.js').catch(function () {});
        // the full offline set is saved only in the installed app, and never on a data-saver connection
        var saver = navigator.connection && navigator.connection.saveData;
        if (isApp() && !saver) navigator.serviceWorker.ready.then(function (r) { if (r.active) r.active.postMessage({ type: 'save-all' }); }).catch(function () {});
      });
    }
  }
  function isApp() {
    return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
  }
  var installPrompt = null;
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); installPrompt = e; });
  // one call anywhere on the site (the Get the app ad, the install page): ask the browser to install the app right now
  window.TOLInstall = {
    ready: function () { return !!installPrompt; },
    ask: function () {
      if (!installPrompt) return Promise.resolve('unavailable');
      var ev = installPrompt; installPrompt = null;
      try { ev.prompt(); } catch (e) { return Promise.resolve('error'); }
      return ev.userChoice.then(function (c) {
        var ok = c && c.outcome === 'accepted';
        if (ok) { try { localStorage.setItem('tol-app-installed', '1'); } catch (e) {} document.dispatchEvent(new CustomEvent('tol-app-installed')); }
        return ok ? 'accepted' : 'dismissed';
      }).catch(function () { return 'error'; });
    }
  };
  // ---------- Professor Puddles: the site's chat host, floating by, with a hello bubble up top ----------
  var PUDDLES_SVG = '<svg viewBox="-4 -14 88 92" aria-hidden="true" focusable="false">' +
    '<path d="M40 8C33 22 14 36 14 50c0 14 12 22 26 22s26-8 26-22C66 36 47 22 40 8z" fill="#CFE6FA" stroke="#7FB2E0" stroke-width="2.6"/>' +
    '<ellipse cx="30" cy="30" rx="5" ry="3" fill="#fff" opacity=".6" transform="rotate(-25 30 30)"/>' +
    '<circle cx="31" cy="46" r="6.2" fill="rgba(255,255,255,.35)" stroke="#3A3350" stroke-width="1.8"/><circle cx="49" cy="46" r="6.2" fill="rgba(255,255,255,.35)" stroke="#3A3350" stroke-width="1.8"/><path d="M37.2 46h5.6" stroke="#3A3350" stroke-width="1.8"/>' +
    '<circle cx="31" cy="46.5" r="2.4" fill="#2B2620"/><circle cx="49" cy="46.5" r="2.4" fill="#2B2620"/><circle cx="31.9" cy="45.6" r=".8" fill="#fff"/><circle cx="49.9" cy="45.6" r=".8" fill="#fff"/>' +
    '<path d="M35 56 Q40 60.5 45 56" fill="none" stroke="#2B2620" stroke-width="2.2" stroke-linecap="round"/>' +
    '<ellipse cx="23" cy="55" rx="3.6" ry="2.2" fill="#F2A3B6" opacity=".85"/><ellipse cx="57" cy="55" rx="3.6" ry="2.2" fill="#F2A3B6" opacity=".85"/>' +
    '<path d="M18 10 L40 1 L62 10 L40 19 Z" fill="#3A3350"/><path d="M29 14.5v6c3 3 19 3 22 0v-6l-11 4.5z" fill="#4A4266"/>' +
    '<path d="M60 10 v11" stroke="#F4D26B" stroke-width="1.6"/><circle cx="60" cy="22.5" r="2.3" fill="#F4D26B"/></svg>';
  var PUDDLES = { name: 'Professor Puddles', svg: PUDDLES_SVG, color: '#CFE6FA',
    greeting: 'Hello! I’m Professor Puddles. Ask me anything about this site, like the book, the workpapers, check-ins or ways to calm down, and I’ll answer from its pages, with a link to read more. What you type stays on this device.' };
  // the hello bubble, at the top of the home page: in full on the first visit, a small chip after that;
  // "Not now" shrinks it to a small chip for the rest of the visit, so it's never lost
  function buildPuddles(body) {
    if (current !== '/index.html' && current !== '/') return;
    var small = false;
    try { small = sessionStorage.getItem('tol-puddles-small') === '1'; } catch (e) {}
    // on a phone the hello starts as its small chip, so the page's opening line and "Start here" fit on the first screen
    if (window.innerWidth <= 560) small = true;
    // calm first: the full hello shows on a visitor's first visit only; after that it is the small chip
    if (lsGet('tol-puddles-hi-seen')) small = true; else lsSet('tol-puddles-hi-seen', '1');
    var hi = el('div', { class: 'tol-puddles-hi' + (small ? ' is-small' : ''), role: 'complementary', 'aria-label': 'Meet Professor Puddles' },
      '<span class="tol-puddles-hi-art">' + PUDDLES_SVG + '</span>' +
      '<p><strong>Meet Professor Puddles!</strong> <span class="tol-puddles-hi-more">Small drop, big brain. Ask anything about the program in your own words, and he’ll answer straight from these pages.</span></p>' +
      '<a class="tol-puddles-hi-go" href="/ask.html">Chat about something</a>' +
      '<button type="button" class="tol-puddles-hi-x" aria-label="Make smaller">&times;</button>');
    hi.querySelector('.tol-puddles-hi-x').addEventListener('click', function () {
      try { sessionStorage.setItem('tol-puddles-small', '1'); } catch (e) {}
      hi.classList.add('is-small');
      hi.querySelector('.tol-puddles-hi-go').focus();
    });
    var main = document.querySelector('main');
    // Professor Puddles sits just above the "Check in on Tidbit & Sugarfoot" link (or below the "what this is" line)
    var pal = main && main.querySelector('[data-palcam-top], #explore .home-extras'), intro = main && main.querySelector('[data-home-intro]');
    if (main && pal) pal.parentNode.insertBefore(hi, pal);
    else if (main) main.insertBefore(hi, intro ? intro.nextSibling : main.firstChild); else body.appendChild(hi);
    setTimeout(function () { hi.classList.add('is-in'); }, small ? 0 : 600);
  }

  // ---------- Professor Puddles, on every page ----------
  // A small round button (bottom left) opens him as a pop-over right on the page, and every mini dive (a word
  // with a water drop) offers "Chat it out with Professor Puddles" beside "Wade in". He answers from this site's own
  // pages, on this device; nothing is sent anywhere. Away in Quiet mode, on the Ask page and in the games.
  function openPud(o) {
    if (window.TOLChat) return window.TOLChat.open(o);
    var sc = document.createElement('script'); sc.src = '/assets/js/site-chat.js';
    sc.onload = function () { if (window.TOLChat) window.TOLChat.open(o); };
    document.head.appendChild(sc);
  }
  function buildPuddlesPop(body) {
    var game = body.classList.contains('is-game');   // games keep the screen to themselves: no floating button, just the note at the end
    if (/^\/(ask|offline|404)\.html$/.test(current) || body.hasAttribute('data-no-puddles') ||
        document.querySelector('meta[http-equiv="Content-Security-Policy"]') || document.querySelector('.pc-ov.is-tv')) return;
    var main = document.querySelector('main'); if (!main) return;
    var h1 = main.querySelector('h1'), title = h1 ? h1.textContent.replace(/\s+/g, ' ').trim() : document.title.split('·')[0].trim();
    function opts(topic) {
      return { name: PUDDLES.name, svg: PUDDLES.svg, color: PUDDLES.color, topic: topic || '',
        greeting: 'Hello! I’m Professor Puddles. Curious about something on “' + title.slice(0, 80) + '”? Ask me in your own words, or tap a word with a water drop 💧 and choose “Chat it out”. I answer from this site’s pages, and what you type stays on this device.' };
    }
    var fab = el('button', { type: 'button', class: 'tol-pud-fab', 'aria-label': 'Ask Professor Puddles about this page', title: 'Ask Professor Puddles' },
      '<span class="tol-pud-fab-art" aria-hidden="true">' + PUDDLES_SVG + '</span><span class="tol-pud-fab-t">Ask Professor Puddles</span>');
    fab.addEventListener('click', function () { openPud(opts('')); });
    if (!game) { body.appendChild(fab); body.classList.add('has-pud-fab'); }
    // on a phone he is a slim tab at the edge; for the first few seconds he shows his name, so people know he's there
    if (!game && window.matchMedia && matchMedia('(max-width:560px)').matches && !main.querySelector('[data-home-intro]')) {
      fab.classList.add('is-named');
      var unname = function () { fab.classList.remove('is-named'); window.removeEventListener('scroll', unname); };
      setTimeout(unname, 6000); setTimeout(function () { window.addEventListener('scroll', unname, { passive: true }); }, 400);
    } if (main.querySelector('[data-home-intro]')) body.classList.add('is-home-pud'); // the home page centres it
    window.TOLPuddles = { open: function (topic) { openPud(opts(topic || '')); } };
    // any link marked data-ask-puddles (like the home page's "Ask Professor Puddles") opens him right here
    document.addEventListener('click', function (e) {
      var t = e.target.closest && e.target.closest('[data-ask-puddles]');
      if (!t || e.metaKey || e.ctrlKey || e.shiftKey) return;
      e.preventDefault(); openPud(opts(''));
    });
    // and at the end of every page: "Want to know more? Ask Professor Puddles!", which opens him already talking about this page
    if (!main.querySelector('.tol-pud-end')) {
      var endBox = el('aside', { class: 'tol-pud-card tol-pud-end no-bubble', 'aria-label': 'Ask Professor Puddles' },
        '<span class="tol-pud-card-art" aria-hidden="true">' + PUDDLES_SVG + '</span>' +
        '<p><strong>Want to know more?</strong> Ask Professor Puddles! He answers in plain words from this site’s own pages, and he can now find you good articles on any topic, too. Nothing you type leaves your device.</p>' +
        '<button type="button" class="tol-pud-card-go">💧 ' + (title && current !== '/index.html' ? 'Ask him about “' + esc(title.replace(/[?.!:]+$/, '').slice(0, 60)) + '”' : 'Ask Professor Puddles') + '</button>');
      endBox.querySelector('button').addEventListener('click', function () { openPud(opts(title && current !== '/index.html' ? 'Tell me more about ' + title.replace(/[?.!:]+$/, '') : '')); /* the home page's headline isn't a topic: just say hello */ });
      main.appendChild(endBox);
    }

  }

  // A little card from Professor Puddles partway through the course pages: "chat about this?"
  var PUD_LINES = [
    ['Got a question bubbling up?', 'I’m a drop of pure curiosity. Let’s chat about “{t}”.'],
    ['Want to dive in together?', 'No question is too small, and no puddle too deep. Ask me about “{t}”.'],
    ['Pssst. Stuck on a word?', 'I read every page of this site (twice, with my glasses on). Let’s chat about “{t}”.'],
    ['Want a little splash of help?', 'Ask me anything about “{t}”, in your own words.'],
    ['Thinking about this one?', 'Me too! I’m positively drip-ping with answers about “{t}”.'],
    ['Would a chat help it sink in?', 'I’ll answer from the pages themselves, with a link to read more. Shall we talk about “{t}”?'],
    ['Office hours are open!', 'The Professor is in, and it’s always a good time to chat about “{t}”.']
  ];
  function buildPuddlesCards(body) {
    var main = document.querySelector('main.read');
    if (!main || body.classList.contains('is-game') || body.hasAttribute('data-no-pudcards') || workMode() || sensitivePage() || /^\/(index|ask|whats-new|pause-and-play)\.html$/.test(current) ||
        document.querySelector('meta[http-equiv="Content-Security-Policy"]')) return;
    var sec = body.getAttribute('data-sec') || '', course = /^\/(book|workpapers|learn)\//.test(current) || /^(book|workpapers|program|self|relationships|start|tools)$/.test(sec);
    if (!course) return;
    var h1 = main.querySelector('h1'); if (!h1) return;
    var topic = h1.textContent.replace(/\s+/g, ' ').trim().replace(/[?.!]$/, '');
    var kids = Array.prototype.filter.call(main.children, function (k) { return /^(P|DIV|OL|UL|SECTION|H2)$/.test(k.tagName) && !k.matches('.read-head, .depth-bar, .tol-gentle, .tol-private, .tol-cheer, .growing-note'); });
    if (!kids.length) return;
    var gate = main.querySelector(':scope > .tol-gate'), open = kids.filter(function (k) { return !k.matches('.tol-gate, .locked-section') && (!gate || (k.compareDocumentPosition(gate) & 4)); });
    if (!open.length) return;
    var after = open[Math.min(open.length - 1, Math.max(0, Math.floor(open.length * 0.6)))];
    if (after.tagName === 'H2' && after.nextElementSibling && after.nextElementSibling !== gate) after = after.nextElementSibling;
    // never between a lead-in paragraph and the list it introduces
    while (after.tagName === 'P' && after.nextElementSibling && /^(UL|OL)$/.test(after.nextElementSibling.tagName)) after = after.nextElementSibling;
    var n = 0; for (var i = 0; i < current.length; i++) n = (n * 31 + current.charCodeAt(i)) % 997; // the same line on the same page
    var line = PUD_LINES[n % PUD_LINES.length];
    var card = el('aside', { class: 'tol-pud-card', 'aria-label': 'Chat with Professor Puddles' },
      '<span class="tol-pud-card-art" aria-hidden="true">' + PUDDLES_SVG + '</span>' +
      '<p><strong>' + esc(line[0]) + '</strong> ' + esc(line[1].replace('{t}', topic)) + '</p>' +
      '<a class="tol-pud-card-go" href="/ask.html?about=' + encodeURIComponent(topic) + '"><span aria-hidden="true">&#128172;</span> Chat with Professor Puddles</a>');
    after.parentNode.insertBefore(card, after.nextSibling);
  }

  // ---------- Pop the bubbles ----------
  // Tap or click anywhere a bubble is floating (not on a link or button) and it pops with a
  // spray of droplets, silently, then drifts back a little later. Hearts give a small
  // heartbeat and a few tiny hearts. Purely for fun; nothing is kept.
  function poplets(x, y, heart, host) {
    for (var i = 0; i < (heart ? 6 : 0); i++) {
      var s = el('span', { class: 'tol-poplet', 'aria-hidden': 'true' }, '\u2665'), a = -Math.PI / 2 + (i - 2.5) * 0.45, d = 34 + (i % 3) * 12;
      s.style.left = x + 'px'; s.style.top = y + 'px'; s.style.setProperty('--dx', Math.round(Math.cos(a) * d) + 'px'); s.style.setProperty('--dy', Math.round(Math.sin(a) * d) + 'px');
      (host || document.body).appendChild(s); setTimeout(function (n) { return function () { n.remove(); }; }(s), 1100);
    }
  }
  function popBubbles() {
    var INTERACTIVE = 'a, button, input, select, textarea, label, summary, [role="button"], [contenteditable], canvas, .tol-dive, .gm-board, .qw, .ws-sheet, .wpf-form, .tol-tip, video, audio, iframe';
    document.addEventListener('pointerdown', function (e) {
      if (e.button > 0 || (e.target.closest && e.target.closest(INTERACTIVE))) return;
      var x = e.clientX, y = e.clientY, hit = null, best = 1e9;
      Array.prototype.forEach.call(document.querySelectorAll('b.tol-bub:not(.is-gone), b.tol-heart'), function (b) {
        var r = b.getBoundingClientRect(); if (!r.width) return;
        var cx = r.left + r.width / 2, cy = r.top + r.height / 2, d = Math.hypot(cx - x, cy - y);
        if (d < Math.max(24, r.width * 0.75) && d < best) { best = d; hit = b; } // a generous target for fingers
      });
      if (!hit) return;
      var r2 = hit.getBoundingClientRect(), host = hit.closest('.tol-breathe') || null;
      if (hit.classList.contains('tol-heart')) {
        hit.classList.add('is-tapped'); poplets(r2.left + r2.width / 2, r2.top, true, host);
        setTimeout(function () { hit.classList.remove('is-tapped'); }, 480);
        return;
      }
      hit.classList.add('is-popped');
      setTimeout(function () { hit.classList.add('is-gone'); hit.classList.remove('is-popped'); }, 600);
      setTimeout(function () { hit.classList.remove('is-gone'); }, 5000 + Math.random() * 6000); // it floats back
    }, { passive: true });
  }

  // The simple / full choice at the top of pages that come in two versions: what each one is,
  // how long it takes, who it suits, and how the mini dives and "Dig deeper" links fit in.
  // It only remembers which one you picked last (on this device), to point it out next time.
  function buildDepthPicker(isFull) {
    var bar = document.querySelector('main .depth-bar');
    if (!bar || bar.classList.contains('tol-depth')) return;
    var label = bar.querySelector(':scope > span'), link = bar.querySelector(':scope > a[href]');
    if (!link || !label || !/^(Simple|Full) version/.test(label.textContent.trim())) return;  // e.g. the Library's theme bars stay as they are
    var chip = label.querySelector('.growing-chip');
    var here = location.pathname, other = link.getAttribute('href');
    var simpleHref = isFull ? other : here, fullHref = isFull ? here : other;
    var main = document.querySelector('main');
    var words = ((main && main.textContent) || '').split(/\s+/).length;
    var mins = Math.max(1, Math.round(words / 230));
    var pref = lsGet('tol-depth-pref');
    function opt(kind, href, icon, name, what, who, time) {
      var cur = (kind === 'full') === isFull;
      // the link holds only the short name; the description sits beside it (the whole card still opens it)
      return '<div class="tol-depth-opt is-' + kind + (cur ? ' is-here' : '') + '">' +
        '<a class="tol-depth-name" href="' + href + '" data-depth="' + kind + '"' + (cur ? ' aria-current="page"' : '') + '><span aria-hidden="true">' + icon + '</span> ' + name + (cur ? ' <small>you’re here</small>' : '') + '</a>' +
        '<span class="tol-depth-time">' + time + '</span>' +
        '<span class="tol-depth-what">' + what + '</span>' +
        '<span class="tol-depth-who">' + who + '</span></div>';
    }
    var box = el('div', { class: 'depth-bar tol-depth', role: 'group', 'aria-label': 'Choose how deep to read' },
      '<p class="tol-depth-q">This page comes in two versions. Pick the one that suits you right now:' + (chip ? ' ' + chip.outerHTML : '') + '</p>' +
      '<div class="tol-depth-opts">' +
        opt('simple', simpleHref, '🌱', 'Simple version', 'The main idea in a few short cards and one small thing to try. Tap a word with a water drop <span aria-hidden="true">💧</span> to dive deeper right here.', 'Good if you’re new, short on time, or tired.', isFull ? 'a few minutes' : 'about ' + mins + ' min read') +
        opt('full', fullHref, '🌊', 'Full version', bar.getAttribute('data-full-what') ? esc(bar.getAttribute('data-full-what')) : 'The whole idea: real-life examples, the reasoning behind it, worked numbers and answers to questions. Technical names appear here, in small print.', 'Good if you want the why, or you’re using it for a real situation.', isFull ? 'about ' + mins + ' min read' : 'a longer read') +
      '</div>' +
      (pref && (pref === 'full') !== isFull ? '<p class="tol-depth-pref">Last time you chose the ' + (pref === 'full' ? 'full' : 'simple') + ' version. It’s one tap away above.</p>' : '') +
      '<details class="tol-depth-more"><summary>How the two versions, “Dig deeper” links and mini dives fit together</summary>' +
        '<p><strong>Both versions teach the same idea.</strong> The simple one gives you the gist; the full one adds the detail. You can switch at any time, and nothing is lost or graded.</p>' +
        '<p><strong>“Dig deeper” links</strong> on the simple cards jump straight to the matching part of the full version, so you only go deep where you want to.</p>' +
        '<p><strong>Mini dives <span aria-hidden="true">💧</span></strong>: words with a little water drop open a short explanation right on the page. Tap one to wade in a step at a time, from the shore to the deep end, then close it and carry on where you were. The deepest step links to the page with everything on it.</p>' +
        '<p>Stuck on anything, in either version? <a href="/ask.html">Ask Professor Puddles</a>.</p>' +
      '</details>' +
      '<p class="tol-gentle' + (isFull ? ' is-deep' : '') + '"><span aria-hidden="true">' + (isFull ? '🌿' : '🌱') + '</span> Take what helps and leave the rest. Nothing here grades you.</p>');
    bar.parentNode.replaceChild(box, bar);
    // some pages fill in their cards after this runs, so count again once everything is on the page
    window.addEventListener('load', function () {
      setTimeout(function () {
        // the page's own words only: not the cards, tips, breaks and helpers the site adds around them
        var clone = main.cloneNode(true); Array.prototype.forEach.call(clone.querySelectorAll('.tol-depth, script, style, nav, .tol-trail, [aria-hidden="true"], .bkb, .tol-pud-card, .tol-tip, .tol-read, .tol-read-host, .tol-fbs, .tol-fp-note, .lp-card, .tol-cheer, .tol-listen, .tol-offer, .tol-private, .tol-pickup, .tol-inshort, .tol-pillars, .tol-work-note'), function (n) { n.remove(); });
        var n = Math.max(1, Math.round((clone.textContent || '').split(/\s+/).filter(Boolean).length / 230)), t = box.querySelector('.is-here .tol-depth-time');
        if (t && n > mins && /min read/.test(t.textContent)) t.textContent = 'about ' + n + ' min read';
      }, 1200);
    });
    Array.prototype.forEach.call(box.querySelectorAll('a[data-depth]'), function (a) {
      a.addEventListener('click', function () { lsSet('tol-depth-pref', a.getAttribute('data-depth')); });
    });
    if (!isFull) lsSet('tol-depth-seen', '1');
  }

  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function ssGet(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
  function ssSet(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} }

  // ---------- Keep the page still ----------
  // One switch (in the menu panel and in the footer) that takes away the moving garden behind the
  // page and the floating bubbles and hearts, and stops the little buddies moving. It starts on by
  // itself when the device asks for less motion, and this browser remembers the choice.
  // Other scripts can read window.TOLStill.on() or listen for the 'tol-still' event.
  var STILL_KEY = 'tol-still', stillHooks = [];
  // on a phone the page starts still too (calmer to read, and kinder to the battery); turning it off in
  // Settings is remembered, like any other choice made here
  function stillDefault() {
    var mm = window.matchMedia;
    return !!(mm && (mm('(prefers-reduced-motion: reduce)').matches || mm('(max-width: 700px) and (pointer: coarse)').matches || mm('(max-width: 560px)').matches));
  }
  var stillOn = (function () {
    var v = lsGet(STILL_KEY);
    if (v === '1' || v === '0') return v === '1';
    return stillDefault();
  })();
  document.documentElement.classList.toggle('tol-still', stillOn);
  // the device's own "reduce motion" choice, unless one was made here
  function refreshStill() {
    var v = lsGet(STILL_KEY);
    setStill(v === '1' || v === '0' ? v === '1' : stillDefault(), true);
  }
  function setStill(on, keep) {
    stillOn = !!on; if (!keep) lsSet(STILL_KEY, stillOn ? '1' : '0');
    document.documentElement.classList.toggle('tol-still', stillOn);
    document.querySelectorAll('.tol-still-btn').forEach(function (b) {
      b.setAttribute('aria-pressed', String(stillOn));
      b.querySelector('.tol-still-state').textContent = stillOn ? 'On' : 'Off';
    });
    stillHooks.forEach(function (f) { try { f(stillOn); } catch (e) {} });
    try { document.dispatchEvent(new CustomEvent('tol-still', { detail: { on: stillOn } })); } catch (e) {}
  }
  function stillButton() {
    var b = el('button', { type: 'button', class: 'tol-still-btn', 'aria-pressed': String(stillOn) },
      '<span class="tol-still-track" aria-hidden="true"><span></span></span>Keep the page still' +
      '<span class="tol-still-state" aria-hidden="true">' + (stillOn ? 'On' : 'Off') + '</span>');
    b.addEventListener('click', function () { setStill(!stillOn); });
    return b;
  }
  // chosen(): only a still page someone asked for (here, or with the device's reduce-motion setting). The movies,
  // the pal cam and the games follow that, not the phone's calmer default, so what people come to watch stays lively.
  function stillChosen() { var v = lsGet(STILL_KEY); if (v === '1' || v === '0') return v === '1'; return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
  window.TOLStill = { on: function () { return stillOn; }, chosen: stillChosen, set: setStill };

  // ---------- Settings: calm and reading choices, in one panel for the whole site ----------
  // Dark follows the device by itself (site.css); a choice made here wins on this device. Text size
  // scales every word on the page. "Hide the helpers" puts away the extra friends: Professor Puddles'
  // cards, the cheering buddies, the pups, tips, the learning trail and petals, and the floating
  // invitations. Quiet mode and Easy reading are one-tap bundles of these choices, and turning one off
  // puts back what was there before. Each choice is one small setting kept in this browser, nothing
  // more; "Back to the usual" clears them all. Other scripts can read window.TOLQuiet:
  //   TOLQuiet.on()    true while Quiet mode is on
  //   TOLQuiet.sound() false when Quiet mode is on or site sounds are switched off in Settings
  //   and listen for the 'tol-quiet' event on document.
  var THEME_KEY = 'tol-theme', SIZE_KEY = 'tol-text-size', HELP_KEY = 'tol-hide-helpers',
      QUIET_KEY = 'tol-quiet', EASY_KEY = 'tol-easy', FONT_KEY = 'tol-font', SPACE_KEY = 'tol-spacing',
      TINT_KEY = 'tol-tint', RULER_KEY = 'tol-ruler', BUB_KEY = 'tol-nobubbles', SOUND_KEY = 'tol-sound-off', PREV_KEY = 'tol-comfort-prev';
  // the sound switches the pal cam and the games keep for themselves
  var SOUND_KEYS = ['tol-pc-sound', 'tol-pc-music', 'tol-qw-sound', 'tol-xw-sound', 'tol-bloom-sound'];
  // four steps, each bigger than the one before (every word on the page is scaled by 1, 1.15, 1.35 or 1.6)
  var SIZE_NAMES = { md: 'Standard', lg: 'Large', xl: 'Larger', xxl: 'Largest' }, SIZE_SCALE = { md: 1, lg: 1.15, xl: 1.35, xxl: 1.6 };
  var TINTS = { cream: 'Cream', blue: 'Soft blue', mint: 'Mint' };
  function quietOn() { return lsGet(QUIET_KEY) === '1'; }
  function easyOn() { return lsGet(EASY_KEY) === '1'; }
  function soundAllowed() { return !quietOn() && lsGet(SOUND_KEY) !== '1'; }
  function setSounds(off) {
    if (off) { lsSet(SOUND_KEY, '1'); SOUND_KEYS.forEach(function (k) { lsSet(k, 'off'); }); }
    else { lsDel(SOUND_KEY); SOUND_KEYS.forEach(lsDel); } // each sound goes back to its own usual setting
  }
  var fontLinked = false;
  function linkEasyFont() {
    if (fontLinked || document.querySelector('meta[http-equiv="Content-Security-Policy"]')) return;
    fontLinked = true;
    var l = document.createElement('link'); l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400;1,700&display=swap';
    document.head.appendChild(l);
  }
  function applyReading() {
    var h = document.documentElement, t = lsGet(THEME_KEY), z = lsGet(SIZE_KEY);
    if (t === 'dark' || t === 'light') h.setAttribute('data-theme', t); else h.removeAttribute('data-theme');
    ['lg', 'xl', 'xxl'].forEach(function (s) { h.classList.toggle('tol-text-' + s, z === s); });
    // pages that draw on a canvas (the games) grow their words with the root size instead of a zoom
    h.classList.toggle('tol-nozoom', !!(document.body && (document.body.classList.contains('is-game') || document.body.hasAttribute('data-no-zoom'))));
    h.classList.toggle('tol-quiet', quietOn());
    h.classList.toggle('tol-no-helpers', lsGet(HELP_KEY) === '1' || quietOn());
    h.classList.toggle('tol-easy', easyOn());
    h.classList.toggle('tol-font-easy', lsGet(FONT_KEY) === 'easy');
    h.classList.toggle('tol-space-wide', lsGet(SPACE_KEY) === 'wide');
    h.classList.toggle('tol-nobubbles', lsGet(BUB_KEY) === '1');
    var tint = lsGet(TINT_KEY);
    Object.keys(TINTS).forEach(function (k) { h.classList.toggle('tol-tint-' + k, tint === k); });
    if (lsGet(FONT_KEY) === 'easy') linkEasyFont();
    ruler(lsGet(RULER_KEY) === '1');
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', darkNow() ? '#1E1B24' : '#F5EFDE');
    document.querySelectorAll('.tol-dark-btn').forEach(function (b) {
      b.setAttribute('aria-pressed', String(darkNow()));
      b.querySelector('.tol-still-state').textContent = darkNow() ? 'On' : 'Off';
    });
    document.querySelectorAll('.tol-quiet-btn').forEach(function (b) {
      b.setAttribute('aria-pressed', String(quietOn()));
      var st = b.querySelector('.tol-still-state'); if (st) st.textContent = quietOn() ? 'On' : 'Off';
    });
    document.querySelectorAll('.tol-set').forEach(syncSettings);
  }
  function darkNow() {
    var t = lsGet(THEME_KEY);
    if (t === 'dark' || t === 'light') return t === 'dark';
    return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  }
  function helpersHidden() { var c = document.documentElement.classList; return c.contains('tol-no-helpers') || c.contains('tol-work'); }
  applyReading();
  if (window.matchMedia) { try { window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyReading); } catch (e) {} }
  function darkButton() {
    var b = el('button', { type: 'button', class: 'tol-still-btn tol-dark-btn', 'aria-pressed': String(darkNow()) },
      '<span class="tol-still-track" aria-hidden="true"><span></span></span>Dark mode' +
      '<span class="tol-still-state" aria-hidden="true">' + (darkNow() ? 'On' : 'Off') + '</span>');
    b.addEventListener('click', function () { lsSet(THEME_KEY, darkNow() ? 'light' : 'dark'); applyReading(); });
    return b;
  }
  function after() { applyReading(); if (typeof barHeightHook === 'function') barHeightHook(); }

  // Quiet mode and Easy reading: one tap turns on a bundle; turning it off puts back what was there
  var PRESETS = {
    quiet: { key: QUIET_KEY, keys: [STILL_KEY, HELP_KEY, SOUND_KEY, BUB_KEY].concat(SOUND_KEYS),
      on: function () { lsSet(HELP_KEY, '1'); setSounds(true); lsSet(STILL_KEY, '1'); lsSet(BUB_KEY, '1'); } },  // still, silent, and plain text without a box round every line
    easy: { key: EASY_KEY, keys: [FONT_KEY, SPACE_KEY, TINT_KEY, STILL_KEY, HELP_KEY],
      on: function () { lsSet(FONT_KEY, 'easy'); lsSet(SPACE_KEY, 'wide'); if (!lsGet(TINT_KEY)) lsSet(TINT_KEY, 'cream'); lsSet(STILL_KEY, '1'); } }  // Easy reading leaves the helpers alone; Hide the helpers is its own switch
  };
  function prevOf(name) { try { return JSON.parse(lsGet(PREV_KEY + '-' + name) || 'null'); } catch (e) { return null; } }
  function setPreset(name, on) {
    var P = PRESETS[name], other = name === 'quiet' ? 'easy' : 'quiet';
    if (on === (lsGet(P.key) === '1')) return;
    if (on) {
      lsSet('tol-comfort-offer', 'done'); document.querySelectorAll('.tol-offer').forEach(function (o) { o.remove(); });
      var prev = {}; P.keys.forEach(function (k) { prev[k] = lsGet(k); });
      lsSet(PREV_KEY + '-' + name, JSON.stringify(prev));
      lsSet(P.key, '1'); P.on();
    } else {
      var was = prevOf(name) || {};
      lsDel(P.key); lsDel(PREV_KEY + '-' + name);
      var otherOn = lsGet(PRESETS[other].key) === '1';
      P.keys.forEach(function (k) {
        if (otherOn && (k === STILL_KEY || k === HELP_KEY)) return; // the other bundle still wants these
        if (was[k] == null) lsDel(k); else lsSet(k, was[k]);
      });
    }
    refreshStill();
    after();
    if (name === 'quiet') quietEvent();
  }
  // tell the games, the pal cam and the sound pages at once (they listen on window, and some on document)
  function quietEvent() {
    var d = { on: quietOn(), sound: soundAllowed() };
    try { window.dispatchEvent(new CustomEvent('tol-quiet', { detail: d })); } catch (e) {}
    try { document.dispatchEvent(new CustomEvent('tol-quiet', { detail: d })); } catch (e) {}
  }
  window.TOLQuiet = { on: quietOn, sound: soundAllowed, set: function (on) { setPreset('quiet', !!on); } };
  window.TOLEasyReading = { on: easyOn, set: function (on) { setPreset('easy', !!on); } };

  function quietButton(kind) {
    var sw = kind === 'switch', b;
    if (sw) b = el('button', { type: 'button', class: 'tol-still-btn tol-quiet-btn', 'aria-pressed': String(quietOn()) },
      '<span class="tol-still-track" aria-hidden="true"><span></span></span>Quiet mode<span class="tol-still-state" aria-hidden="true">' + (quietOn() ? 'On' : 'Off') + '</span>');
    else {
      b = el('button', { type: 'button', class: 'tol-quiet-btn tol-bar-quiet', 'aria-pressed': String(quietOn()), title: 'Quiet mode: a still page with no helpers, pop-ups, sounds, levels or petals' },
        '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><path d="M19.5 14.2A7.8 7.8 0 1 1 9.8 4.5a6.2 6.2 0 0 0 9.7 9.7z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>' +
        '<span class="tol-quiet-name">Quiet</span>');
      b.setAttribute('aria-label', 'Quiet mode');
    }
    b.addEventListener('click', function () { setPreset('quiet', !quietOn()); announce(quietOn() ? 'Quiet mode is on: the page is still, and helpers, pop-ups, sounds, levels and petals are off.' : 'Quiet mode is off. Everything is back the way it was.'); });
    return b;
  }
  function settingsButton(cls, text) {
    var b = el('button', { type: 'button', class: 'tol-set-btn ' + (cls || ''), 'aria-haspopup': 'dialog' },
      '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="16" cy="6" r="2.2" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="10" cy="12" r="2.2" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="18" cy="18" r="2.2" fill="none" stroke="currentColor" stroke-width="2"/></svg>' +
      '<span class="tol-set-name">' + (text || 'Settings') + '</span>');
    b.setAttribute('aria-label', 'Settings: calm and reading choices');
    b.addEventListener('click', function () { openSettings(b); });
    return b;
  }
  // a polite line for screen readers when something changes without moving focus
  var liveBox = null;
  function announce(t) {
    if (!liveBox) { liveBox = el('p', { class: 'sr-only', role: 'status', 'aria-live': 'polite' }); document.body.appendChild(liveBox); }
    liveBox.textContent = ''; setTimeout(function () { liveBox.textContent = t; }, 60);
  }

  // ---- the Settings panel ----
  var setBox = null, setLast = null, setInerted = [];
  var wxPending = false;   // while the browser is asking for the location, the switch stays on
  function syncSettings(box) {
    var t = lsGet(THEME_KEY) || 'auto', z = lsGet(SIZE_KEY) || 'md';
    box.querySelectorAll('input[data-theme-opt]').forEach(function (i) { i.checked = i.value === t; });
    box.querySelectorAll('input[data-size-opt]').forEach(function (i) { i.checked = i.value === z; });
    box.querySelectorAll('input[data-font-opt]').forEach(function (i) { i.checked = i.value === (lsGet(FONT_KEY) || 'usual'); });
    box.querySelectorAll('input[data-space-opt]').forEach(function (i) { i.checked = i.value === (lsGet(SPACE_KEY) || 'usual'); });
    box.querySelectorAll('input[data-tint-opt]').forEach(function (i) { i.checked = i.value === (lsGet(TINT_KEY) || 'none'); });
    var map = { still: stillOn, helpers: helpersHidden(), sound: !soundAllowed(), ruler: lsGet(RULER_KEY) === '1', bubbles: lsGet(BUB_KEY) !== '1', wxnote: lsGet('tol-clockwx-off') !== '1' && (lsGet('tol-clockwx-on') === '1' || !!lsGet('tol-pc-wx')), wxloc: !!lsGet('tol-pc-wx') || wxPending };
    box.querySelectorAll('input[data-switch]').forEach(function (i) { i.checked = !!map[i.getAttribute('data-switch')]; i.disabled = quietOn() && !/^(ruler|bubbles|wxnote|wxloc)$/.test(i.getAttribute('data-switch')); });
    box.querySelectorAll('[data-preset]').forEach(function (b) { b.setAttribute('aria-pressed', String(lsGet(PRESETS[b.getAttribute('data-preset')].key) === '1')); });
    var qn = box.querySelector('.tol-set-qnote'); if (qn) qn.hidden = !quietOn();

  }
  function buildSettings() {
    var id = 'tol-set-' + Math.random().toString(36).slice(2, 7);
    function radio(group, attr, val, text) {
      return '<label><input type="radio" name="' + id + '-' + group + '" value="' + val + '" ' + attr + '> ' + text + '</label>';
    }
    function sw(key, text, note) {
      return '<label class="tol-set-sw"><input type="checkbox" data-switch="' + key + '"><span class="tol-set-track" aria-hidden="true"><span></span></span><span>' + text + (note ? '<small>' + note + '</small>' : '') + '</span></label>';
    }
    var box = el('div', { class: 'tol-set', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': id + '-h', hidden: '' },
      '<div class="tol-set-card">' +
      '<div class="tol-set-head"><h2 id="' + id + '-h">Settings</h2><button type="button" class="tol-set-close">Close</button></div>' +
      '<p class="tol-set-intro">Make the site calmer, or easier to read. Your choices stay on this device only.</p>' +
      '<div class="tol-set-presets">' +
        '<button type="button" class="tol-preset" data-preset="quiet" aria-pressed="false"><span class="tol-preset-ico" aria-hidden="true">&#127769;</span><strong>Quiet mode</strong><small>A still page in plain text. No helpers, pop-ups or sounds, no boxes round every line, and no levels or petals.</small><span class="tol-preset-state" aria-hidden="true"></span></button>' +
        '<button type="button" class="tol-preset" data-preset="easy" aria-pressed="false"><span class="tol-preset-ico" aria-hidden="true">&#128214;</span><strong>Easy reading</strong><small>A clear, roomy font, more space between letters and lines, shorter lines, a soft tint and a still page.</small><span class="tol-preset-state" aria-hidden="true"></span></button>' +
      '</div>' +
      '<h3 class="tol-set-k">Calm</h3>' +
      '<p class="tol-set-qnote" hidden>Quiet mode is looking after these. Turn it off above to change them one by one.</p>' +
      sw('still', 'Keep the page still', 'No moving garden, bubbles, hearts or sliding in, here and in the Breathe break') +
      sw('helpers', 'Hide the helpers', 'Professor Puddles’ cards, the cheering buddies, the pups popping in while you read, tips, petals and pop-up invitations. The “Check in on Tidbit & Sugarfoot” button stays, for when you want them.') +
      sw('sound', 'Keep site sounds off', 'When this is on, the pal cam, the games and the Breathe break start silent') +
      '<h3 class="tol-set-k">Reading</h3>' +
      '<p class="tol-set-listen" hidden><button type="button" class="tol-set-listen-go">Listen to this page</button> <small>Your device reads the page aloud, with a speed control and “Read from where I am”.</small></p>' +
      '<fieldset class="tol-set-sizes"><legend>Text size <small>(smallest to biggest)</small></legend>' + ['md', 'lg', 'xl', 'xxl'].map(function (k) { return radio('size', 'data-size-opt', k, '<span class="tol-set-size tol-set-size-' + k + '">' + SIZE_NAMES[k] + '</span>'); }).join('') + '</fieldset>' +
      '<fieldset><legend>Font</legend>' + radio('font', 'data-font-opt', 'usual', 'The usual') + radio('font', 'data-font-opt', 'easy', '<span class="tol-set-easyfont">Easy to read</span>') + '</fieldset>' +
      '<fieldset><legend>Spacing</legend>' + radio('space', 'data-space-opt', 'usual', 'The usual') + radio('space', 'data-space-opt', 'wide', 'Roomy') + '</fieldset>' +
      '<fieldset><legend>Page tint</legend>' + radio('tint', 'data-tint-opt', 'none', 'None') + Object.keys(TINTS).map(function (k) { return radio('tint', 'data-tint-opt', k, '<span class="tol-set-swatch is-' + k + '" aria-hidden="true"></span>' + TINTS[k]); }).join('') + '</fieldset>' +
      '<fieldset><legend>Colors (dark mode)</legend>' + radio('theme', 'data-theme-opt', 'auto', 'Follow my device') + radio('theme', 'data-theme-opt', 'light', 'Light') + radio('theme', 'data-theme-opt', 'dark', 'Dark') + '</fieldset>' +
      sw('ruler', 'Reading ruler', 'A soft band that follows your pointer or finger, so you keep your place on the line') +
      sw('bubbles', 'Text bubbles', 'Each piece of text sits in its own soft, round bubble. Turn this off for plain text on the page') +
      '<h3 class="tol-set-k">Time and weather</h3>' +
      sw('wxnote', 'Show the time and weather note', 'A very faint note in the corner of each page') +
      sw('wxloc', 'Use my location for the weather', 'Your browser asks first. Only a rounded spot is kept, on this device. To look up the weather, that rounded spot is sent to Open-Meteo, a free weather service with no account. Nothing is sent to us. Turn this off to forget it') +
      '<p class="tol-set-wxmsg" role="status" hidden></p>' +
      '<p class="tol-set-foot">These choices stay in this browser only. <button type="button" class="tol-set-reset">Back to the usual</button> <a href="/on-this-device.html">What’s stored on this device</a></p>' +
      '</div>');
    box.addEventListener('change', function (e) {
      var i = e.target;
      if (i.hasAttribute('data-size-opt')) { if (i.value === 'md') lsDel(SIZE_KEY); else lsSet(SIZE_KEY, i.value); }
      if (i.hasAttribute('data-theme-opt')) { if (i.value === 'auto') lsDel(THEME_KEY); else lsSet(THEME_KEY, i.value); }
      if (i.hasAttribute('data-font-opt')) { if (i.value === 'usual') lsDel(FONT_KEY); else lsSet(FONT_KEY, i.value); }
      if (i.hasAttribute('data-space-opt')) { if (i.value === 'usual') lsDel(SPACE_KEY); else lsSet(SPACE_KEY, i.value); }
      if (i.hasAttribute('data-tint-opt')) { if (i.value === 'none') lsDel(TINT_KEY); else lsSet(TINT_KEY, i.value); }
      var s = i.getAttribute('data-switch');
      if (s === 'still') { setStill(i.checked); }
      if (s === 'helpers') { if (i.checked) lsSet(HELP_KEY, '1'); else lsDel(HELP_KEY); }
      if (s === 'sound') { setSounds(i.checked); quietEvent(); }
      if (s === 'ruler') { if (i.checked) lsSet(RULER_KEY, '1'); else lsDel(RULER_KEY); }
      if (s === 'bubbles') { if (i.checked) lsDel(BUB_KEY); else lsSet(BUB_KEY, '1'); }
      if (s === 'wxnote') { var cw = window.TOLClockWx; if (cw && cw.show) cw.show(i.checked); else if (i.checked) { lsDel('tol-clockwx-off'); lsSet('tol-clockwx-on', '1'); var cwl = document.createElement('script'); cwl.src = '/assets/js/clock-weather.js'; document.head.appendChild(cwl); } else { lsSet('tol-clockwx-off', '1'); lsDel('tol-clockwx-on'); } }
      if (s === 'wxloc') {
        var msg = box.querySelector('.tol-set-wxmsg'), cw2 = window.TOLClockWx;
        if (!i.checked) { if (cw2 && cw2.off) cw2.off(); else lsDel('tol-pc-wx'); if (msg) msg.hidden = true; }
        else {
          if (msg) { msg.hidden = false; msg.textContent = 'Asking your browser… choose Allow when it asks.'; }
          var go = function () { return window.TOLClockWx && window.TOLClockWx.ask ? window.TOLClockWx.ask() : Promise.resolve('unavailable'); };
          if (!window.TOLClockWx || !window.TOLClockWx.ask) { lsDel('tol-clockwx-off'); lsSet('tol-clockwx-on', '1'); }
          wxPending = true;
          go().then(function (r) {
            wxPending = false; var ok = r === 'ok'; i.checked = ok;
            if (msg) { msg.hidden = ok; if (!ok) msg.textContent = r === 'denied' ? 'Your browser has location blocked for this site. Allow it in the browser’s site settings (the lock or tune icon next to the address), then switch this on again.' : 'The weather could not be found just now. Try again in a moment.'; }
          });
        }
      }
      after();
    });
    box.addEventListener('click', function (e) {
      var p = e.target.closest('[data-preset]');
      if (p) { var n = p.getAttribute('data-preset'); setPreset(n, lsGet(PRESETS[n].key) !== '1'); }
      if (e.target.closest('.tol-set-close') || e.target === box) closeSettings();
      if (e.target.closest('.tol-set-listen-go')) { var lg = document.querySelector('.tol-listen-go'); closeSettings(); if (lg) { lg.scrollIntoView({ block: 'center' }); lg.click(); } }
      if (e.target.closest('.tol-set-reset')) {
        [QUIET_KEY, EASY_KEY, PREV_KEY + '-quiet', PREV_KEY + '-easy', SIZE_KEY, THEME_KEY, HELP_KEY, FONT_KEY, SPACE_KEY, TINT_KEY, RULER_KEY, BUB_KEY, STILL_KEY].forEach(lsDel);
        setSounds(false); refreshStill(); after(); quietEvent(); announce('Everything is back to the usual.');
      }
    });
    box.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.stopPropagation(); closeSettings(); }
      if (e.key === 'Tab') {
        var f = Array.prototype.filter.call(box.querySelectorAll('a[href], button:not([disabled]), input:not([disabled])'), function (n) { return n.getClientRects().length > 0 && (n.type !== 'radio' || n.checked); });
        if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    document.body.appendChild(box);
    return box;
  }
  function openSettings(from) {
    if (panel && !panel.hidden) closePanel();
    closeDrop();
    if (!setBox) setBox = buildSettings();
    setLast = from || document.activeElement;
    syncSettings(setBox);
    var sl = setBox.querySelector('.tol-set-listen'); if (sl) sl.hidden = !document.querySelector('.tol-listen-go');
    setBox.hidden = false;
    setInerted = Array.prototype.filter.call(document.body.children, function (n) { return n !== setBox && !n.hasAttribute('inert') && !/^(SCRIPT|STYLE|LINK)$/.test(n.tagName); });
    setInerted.forEach(function (n) { n.setAttribute('inert', ''); });
    setBox.querySelector('.tol-set-close').focus({ preventScroll: true });
  }
  function closeSettings() {
    if (!setBox || setBox.hidden) return;
    setInerted.forEach(function (n) { n.removeAttribute('inert'); }); setInerted = [];
    setBox.hidden = true;
    if (setLast && setLast.focus) setLast.focus();
  }
  window.TOLSettings = { open: openSettings, close: closeSettings };

  // ---- the reading ruler: a soft band across the page that follows the pointer, a finger, or focus ----
  var rulerEl = null;
  function rulerAt(y) { if (rulerEl) rulerEl.style.transform = 'translateY(' + Math.round(y - rulerEl.offsetHeight / 2) + 'px)'; }
  function rulerMove(e) { var t = e.touches ? e.touches[0] : e; if (t) rulerAt(t.clientY); }
  function rulerFocus(e) { var r = e.target && e.target.getBoundingClientRect && e.target.getBoundingClientRect(); if (r && r.height < window.innerHeight / 2) rulerAt(r.top + r.height / 2); }
  function ruler(on) {
    if (on && !rulerEl && document.body) {
      rulerEl = el('div', { class: 'tol-ruler', 'aria-hidden': 'true' });
      document.body.appendChild(rulerEl); rulerAt(window.innerHeight * 0.4);
      document.addEventListener('pointermove', rulerMove, { passive: true });
      document.addEventListener('touchstart', rulerMove, { passive: true });
      document.addEventListener('focusin', rulerFocus);
    } else if (!on && rulerEl) {
      rulerEl.remove(); rulerEl = null;
      document.removeEventListener('pointermove', rulerMove); document.removeEventListener('touchstart', rulerMove); document.removeEventListener('focusin', rulerFocus);
    }
  }

  // ---- a gentle offer on the first visit: Quiet mode or Easy reading, one tap each ----
  function comfortOffer(body) {
    if (lsGet('tol-comfort-offer') || quietOn() || easyOn() || body.classList.contains('is-game') || body.hasAttribute('data-no-offer') ||
        document.querySelector('meta[http-equiv="Content-Security-Policy"]') || /^\/(404|offline|garden-backdrop|pal-cam-tv|on-this-device|upset-right-now|safety|sent-this|wp-11)\.html$|^\/workpapers\/fill\/wp-11\.html$/.test(current)) return;
    var main = document.querySelector('main'); if (!main) return;
    lsSet('tol-comfort-offer', 'shown'); // offered once; Settings at the top is always there
    var box = el('aside', { class: 'tol-offer no-bubble no-cheer', 'aria-label': 'Make the site calmer or easier to read' },
      '<p><strong>Would a calmer page help?</strong> Quiet mode keeps everything still, silent and plain, with no pop-ups. Easy reading uses a clear font and roomy lines. You can change either one any time in <em>Settings</em> at the top.</p>' +
      '<p class="tol-offer-row"><button type="button" data-offer="quiet">Quiet mode</button><button type="button" data-offer="easy">Easy reading</button><button type="button" data-offer="no" class="is-quiet">No thanks</button></p>');
    box.addEventListener('click', function (e) {
      var b = e.target.closest('[data-offer]'); if (!b) return;
      var what = b.getAttribute('data-offer');
      lsSet('tol-comfort-offer', 'done');
      if (what !== 'no') { setPreset(what, true); announce(what === 'quiet' ? 'Quiet mode is on.' : 'Easy reading is on.'); }
      // focus goes to whatever came next (the page's first heading if nothing else), so a screen reader lands somewhere real
      var nx = box.nextElementSibling, m = document.getElementById('tol-main'); box.remove();
      var tgt = (nx && nx.matches && nx.matches('h1, h2, h3, p, section, header') ? nx : null) || document.querySelector('main h1, main h2');
      if (tgt) { if (!tgt.hasAttribute('tabindex')) tgt.setAttribute('tabindex', '-1'); tgt.focus({ preventScroll: true }); } else if (m) m.focus({ preventScroll: true });
    });
    var intro = main.querySelector('[data-home-intro]'), head = main.querySelector('.read-head');
    // someone arriving from a link (a partner sent it, a search) sees the page first, and the offer after its opening part
    var fromOutside = !intro && document.referrer.indexOf(location.origin) !== 0, firstPart = fromOutside && main.querySelector('main > section, .read-head ~ section');
    if (intro) homeSlot(intro).after(box);
    else if (firstPart) firstPart.after(box);                   // home: after the approved opening, so its order stays as it is
    else if (head && head.parentNode === main) head.after(box);
    else main.insertBefore(box, main.firstChild);
  }

  // the home page's slot for extras: just after the "New" notices, which end the approved opening
  function homeSlot(intro) {
    var m = intro.closest('main') || document, st = m.querySelector('.announce-stack');
    if (!st) return intro;
    var last = st; while (last.nextElementSibling && /tol-pickup-host|tol-offer/.test(last.nextElementSibling.className)) last = last.nextElementSibling;
    return last;
  }
  var barHeightHook = null;
  function lsDel(k) { try { localStorage.removeItem(k); } catch (e) {} }
  window.TOLReadingOptions = { dark: darkNow, helpersHidden: helpersHidden };

  // "Add to your home screen": the browser's own prompt where there is one, otherwise how-to steps
  function showInstall() {
    if (installPrompt) {
      installPrompt.prompt();
      installPrompt.userChoice.then(function () { installPrompt = null; }).catch(function () {});
      return;
    }
    var ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    var steps = ios
      ? '<li>Tap the <strong>Share</strong> button <span aria-hidden="true">(the square with an arrow)</span>.</li><li>Scroll down and tap <strong>Add to Home Screen</strong>.</li><li>Tap <strong>Add</strong>.</li>'
      : '<li>Open your browser’s menu <span aria-hidden="true">(&#8942; or &#8943;)</span>.</li><li>Tap <strong>Add to Home screen</strong> or <strong>Install app</strong>.</li><li>Confirm, and look for the two little bubbles on your home screen.</li>';
    var d = el('div', { class: 'tol-install', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'tol-install-h' },
      '<div class="tol-install-card"><img src="/assets/icons/icon-192.png" alt="" width="72" height="72">' +
      '<h2 id="tol-install-h">Keep us on your home screen</h2>' +
      '<p>It opens like an app, works without a connection, and nothing you type ever leaves your phone.</p>' +
      '<ol>' + steps + '</ol><p><a href="/install.html">More help, and what about widgets</a></p><button type="button" class="tol-install-close">Got it</button></div>');
    function close() { d.remove(); document.removeEventListener('keydown', onKey); }
    function onKey(e) { if (e.key === 'Escape') close(); }
    d.addEventListener('click', function (e) { if (e.target === d || e.target.classList.contains('tol-install-close')) close(); });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(d);
    d.querySelector('.tol-install-close').focus();
  }

  // One gentle invitation, on a phone, on a later day's visit. "Not now" means never again.
  function maybeInviteInstall() {
    var today = new Date().toDateString(), days = [];
    try { days = JSON.parse(lsGet('tol-visit-days') || '[]') || []; } catch (e) { days = []; }
    if (days.indexOf(today) === -1 && !lsGet('tol-recent-off')) { days.push(today); lsSet('tol-visit-days', JSON.stringify(days.slice(-30))); }
    if (isApp() || lsGet('tol-install-asked') || days.length < 2 || window.innerWidth > 760) return;
    if (document.body.hasAttribute('data-no-breathe') || location.pathname === '/offline.html') return; // not over the garden
    if (ssGet('tol-invite-seen')) return; // at most once a visit
    setTimeout(function () {
      if (lsGet('tol-install-asked') || ssGet('tol-invite-seen') || document.querySelector('.tol-breathe:not([hidden]), .tol-install, .tol-wx')) return;
      lsSet('tol-install-asked', '1'); ssSet('tol-invite-seen', '1');
      var t = el('div', { class: 'tol-invite', role: 'status' },
        '<img src="/assets/img/logo-mark.svg" alt="" width="44" height="44"><p>Want us on your home screen? It opens like an app, and nothing you type leaves your phone.</p>' +
        '<span><button type="button" class="tol-invite-yes">Show me how</button><button type="button" class="tol-invite-no">Not now</button></span>');
      t.querySelector('.tol-invite-yes').addEventListener('click', function () { t.remove(); showInstall(); });
      t.querySelector('.tol-invite-no').addEventListener('click', function () { t.remove(); });
      document.body.appendChild(t);
    }, 120000);
  }

  // ---------- Is something being worked on here? ----------
  // Tools, the chat and the games are for doing things: no invitations or "did you know" bubbles there,
  // only on reading pages. Also quiet after a heavy weather check today (fogged in, or gusty and high).
  var TOOL_PAGES = /^\/(ask|conversation-reader|signal-translator|carrier-wave-decoder|lemonade-stand|wiring-card|quick-checks|start-in-10-minutes|night-garden|calm-visualizer|frequency-journey(-play)?|pause-and-play|word-bloom|quiet-words|quiet-crossword|daily-ledger-crossword|calc01-solvency|is-the-setup-working|dashboard|keepsakes|quest|on-this-device|pal-cam-tv|echoes-of-gold|soundscapes)\.html$|^\/(workpapers\/(fill|calculators)|tools|do|snapshot)\//;
  function heavyToday() {
    try {
      var a = JSON.parse(lsGet('tol-weather-v1') || '[]'), e = a[a.length - 1], d = new Date();
      var today = d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
      return !!(e && e.d === today && (e.sky === 'fog' || (e.sky === 'gusty' && (e.i || 0) >= 60)));
    } catch (e) { return false; }
  }
  function busyPage() {
    var b = document.body;
    if (b.classList.contains('is-game') || TOOL_PAGES.test(current)) return true;
    var a = document.activeElement;
    if (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && a.type !== 'search') return true;     // typing right now
    if (document.querySelector('.tol-breathe:not([hidden]), .pc-ov:not([hidden]), [role="dialog"][aria-modal="true"]:not([hidden]):not(.tol-set):not(#tol-panel)')) return true;
    if (mediaPlaying()) return true;                                                              // a video or episode is playing
    return heavyToday();
  }
  // someone whose device asks for less motion rarely wants things sliding in either: no pop-up invitations then
  function calmDevice() { try { return !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; } }
  // a Frequency Buddies episode, or any video on the page, playing right now
  function mediaPlaying() {
    if (document.querySelector('.fb-player.is-playing')) return true;
    return Array.prototype.some.call(document.querySelectorAll('video:not(.tol-awake-v)'), function (v) { return !v.paused && !v.ended && v.readyState > 2; });
  }
  // ---------- keep the screen awake while something is playing ----------
  // An episode, a video, the pal cam or any music or sounds: the phone or computer won't dim and lock
  // while they play, and goes back to normal once they stop. Nothing is stored or sent.
  (function () {
    var hasLock = 'wakeLock' in navigator;
    var ctxs = [], lock = null, asking = false, vid = null, lockFailed = false;
    ['AudioContext', 'webkitAudioContext'].forEach(function (n) {
      var A = window[n]; if (!A || A.__tolAwake) return;
      var Wrap = function (o) { var c = o === undefined ? new A() : new A(o); ctxs.push(c); return c; };
      Wrap.prototype = A.prototype; Wrap.__tolAwake = true;
      try { window[n] = Wrap; } catch (e) {}
    });
    function soundOn() {
      if (document.querySelector('.fb-player')) return false; // the movie player says for itself when it's playing
      for (var i = 0; i < ctxs.length; i++) {
        var c = ctxs[i]; if (c.state !== 'running') continue;
        if (c === window.__pcAudio && !document.querySelector('.pc-ov:not([hidden])')) continue; // the pal cam, once closed
        return true;
      }
      return false;
    }
    function playing() {
      if (document.querySelector('.fb-player.is-playing, .pc-ov:not([hidden]), .tol-breathe:not([hidden])')) return true;
      if (Array.prototype.some.call(document.querySelectorAll('video:not(.tol-awake-v), audio'), function (v) { return !v.paused && !v.ended; })) return true;
      return soundOn();
    }
    // where the browser has no screen lock (older iPhones) or refuses one, a tiny silent video playing out of
    // sight does the same job; it can only start from a tap, so a tap on the page also tries it
    function vidOn(fromTap) {
      if (!vid) {
        vid = document.createElement('video'); vid.src = '/assets/video/awake.mp4'; vid.loop = true; vid.muted = true; vid.setAttribute('muted', ''); vid.setAttribute('playsinline', ''); vid.setAttribute('aria-hidden', 'true'); vid.tabIndex = -1;
        vid.className = 'tol-awake-v'; vid.style.cssText = 'position:fixed;left:0;bottom:0;width:1px;height:1px;opacity:.01;pointer-events:none;z-index:-1';
        document.body.appendChild(vid);
      }
      if (vid.paused) { try { var p = vid.play(); if (p && p.catch) p.catch(function () {}); } catch (e) {} }
    }
    function vidOff() { if (vid && !vid.paused) try { vid.pause(); } catch (e) {} }
    function check(fromTap) {
      var want = !document.hidden && playing();
      if (want && hasLock && !lockFailed && !lock && !asking) {
        asking = true;
        try { navigator.wakeLock.request('screen').then(function (l) { asking = false; lock = l; vidOff(); l.addEventListener('release', function () { lock = null; }); }).catch(function () { asking = false; lockFailed = true; vidOn(fromTap); }); } catch (e) { asking = false; lockFailed = true; }
      }
      if (want && (!hasLock || lockFailed) && !lock) vidOn(fromTap);
      if (!want) { if (lock) { try { lock.release(); } catch (e) {} lock = null; } vidOff(); lockFailed = false; }
    }
    setInterval(function () { check(false); }, 3000);
    document.addEventListener('visibilitychange', function () { setTimeout(function () { check(false); }, 300); }); // the lock ends when the page is hidden; ask again on return
    // a tap starts things playing: check right away (still inside the tap, so the fallback video may start) and again a moment later
    ['click', 'touchend', 'keydown'].forEach(function (ev) { document.addEventListener(ev, function () { check(true); setTimeout(function () { check(true); }, 700); }, true); });
    window.TOLAwake = { check: check, held: function () { return !!lock || !!(vid && !vid.paused); } };
  })();

  window.TOLSite = { busy: busyPage, heavyToday: heavyToday, sensitive: sensitivePage, playing: mediaPlaying, calmDevice: calmDevice, readingPage: function () { return !busyPage() && !!document.querySelector('main.read'); } };

  // ---------- Today's Weather, as a small floating invitation ----------
  // Bottom-left, and never while someone has only just started reading: at most once a visit, after
  // a minute on the page or once they've scrolled a real way down. Tap to check in; × hides it for
  // today, and "Don't show again" (right beside it) hides it for good. It stays away once today's
  // weather is logged.
  var SKIP_WEATHER = ['/quick-checks.html', '/night-garden.html', '/dashboard.html', '/offline.html', '/404.html'];
  function buildWeatherNudge(body) {
    if (SKIP_WEATHER.indexOf(current) !== -1 || helpersHidden() || busyPage() || sensitivePage() || calmDevice() || body.hasAttribute('data-no-weather') || document.querySelector('.wpf-bar')) return;
    var today = new Date().toISOString().slice(0, 10);
    if (lsGet('tol-weather-nudge') === 'never') return;
    // at most once a week: after it's been shown (or hidden with ×), it stays away for seven days
    var lastSeen = lsGet('tol-weather-nudge-seen') || (/^\d{4}-\d{2}-\d{2}$/.test(lsGet('tol-weather-nudge') || '') ? lsGet('tol-weather-nudge') : '');
    if (lastSeen && (Date.parse(today) - Date.parse(lastSeen)) / 864e5 < 7) return;
    try { var log = JSON.parse(lsGet('tol-weather-v1') || '[]'); if (log.length && log[log.length - 1].d === today) return; } catch (e) {}
    if (ssGet('tol-wx-seen')) return; // once a visit is plenty
    var art = '<svg viewBox="0 0 64 52" aria-hidden="true">' +
      '<g class="tol-wx-sun"><circle cx="42" cy="17" r="11" fill="#F8DC6E"/><g stroke="#F3C94A" stroke-width="2.4" stroke-linecap="round"><path d="M42 1v3M56 17h3M52 6l2-2M52 28l2 2M32 6l-2-2"/></g></g>' +
      '<path d="M14 44c-6 0-10-4-10-9s4-9 9-9c1-7 7-12 14-12 8 0 13 5 14 12 5 0 9 4 9 9s-4 9-9 9z" fill="#FFFFFF" stroke="#C9B8EC" stroke-width="2"/>' +
      '<circle cx="22" cy="33" r="2" fill="#2B2620"/><circle cx="33" cy="33" r="2" fill="#2B2620"/><path d="M25 38c1.5 1.5 4.5 1.5 6 0" fill="none" stroke="#2B2620" stroke-width="1.8" stroke-linecap="round"/>' +
      '<ellipse cx="18" cy="37" rx="2.6" ry="1.6" fill="#F7B8C6"/><ellipse cx="37" cy="37" rx="2.6" ry="1.6" fill="#F7B8C6"/></svg>';
    // the link keeps its full name even when a small or zoomed screen shows only the little cloud
    var w = el('div', { class: 'tol-wx', role: 'complementary', 'aria-label': 'Today’s Weather' },
      '<a class="tol-wx-go" href="/quick-checks.html#today" aria-label="How’s your weather today? A one-minute check-in">' + art + '<span><strong>How’s your weather today?</strong><small>A one-minute check-in</small></span></a>' +
      '<button type="button" class="tol-wx-never">Don’t show again</button>' +
      '<button type="button" class="tol-wx-x" aria-label="Hide for this week">&times;</button>');
    function bye(mode) {
      lsSet('tol-weather-nudge', mode);
      var back = w.contains(document.activeElement);
      w.classList.add('is-bye');
      setTimeout(function () { w.remove(); }, 300);
      if (back) { var m = document.getElementById('tol-main'); if (m) m.focus({ preventScroll: true }); }
    }
    w.querySelector('.tol-wx-x').addEventListener('click', function () { bye(today); });
    w.querySelector('.tol-wx-never').addEventListener('click', function () { bye('never'); });
    var t0 = Date.now(), timer = null, done = false;
    function show() {
      if (done) return;
      if (document.hidden) { timer = setTimeout(show, 5000); return; }            // wait until the page is being looked at
      if (document.querySelector('.tol-invite, .tol-install, .tol-breathe:not([hidden])')) { timer = setTimeout(show, 15000); return; } // never alongside another invitation
      done = true; clearTimeout(timer); window.removeEventListener('scroll', onScroll);
      if (busyPage()) return; // something is being worked on now: not today
      ssSet('tol-wx-seen', '1'); lsSet('tol-weather-nudge-seen', today);
      body.appendChild(w); requestAnimationFrame(function () { w.classList.add('is-in'); });
      // left alone, it slips away after twenty seconds, so it never sits over what someone is reading
      var linger = function () { if (!w.isConnected) return; if (w.contains(document.activeElement) || w.matches(':hover')) { setTimeout(linger, 8000); return; } w.classList.add('is-bye'); setTimeout(function () { w.remove(); }, 300); };
      setTimeout(linger, 20000);
    }
    // a real scroll: more than a screen's worth down the page, at least 15 seconds in
    function onScroll() { if (window.scrollY > window.innerHeight && Date.now() - t0 > 15000) show(); }
    window.addEventListener('scroll', onScroll, { passive: true });
    timer = setTimeout(show, 60000);
  }

  // ---------- While reading, the floating buttons step aside ----------
  // Scrolling down (reading) tucks away Ask Professor Puddles, Breathe and Back to top, so they never sit on
  // the words; scrolling up, reaching the top or the end, or tabbing to one of them brings them straight back.
  (function () {
    var lastY = window.scrollY || 0, ticking = false, h = document.documentElement;
    function upd() {
      ticking = false;
      var y = window.scrollY || 0, max = document.documentElement.scrollHeight - window.innerHeight, dy = y - lastY;
      if (y < 240 || y > max - 320) h.classList.remove('tol-reading');
      else if (dy > 6) h.classList.add('tol-reading');
      else if (dy < -24) h.classList.remove('tol-reading');
      if (Math.abs(dy) > 6 || y < 240) lastY = y;
    }
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(upd); } }, { passive: true });
  })();

  // ---------- Pal cam (the Frequency Journey's Tidbit & Sugarfoot), openable from any page ----------
  // Nothing loads until it's asked for: a [data-palcam-open] link, or the occasional "Peek?"
  // invitation (pals-cam-invite.js, fetched only on the page views that roll it). The Journey pages
  // load the cam themselves. Nothing is sent anywhere; the invitation's memory is sessionStorage.
  var PALCAM_FILES = ['/assets/js/pups.js', '/assets/js/pals-cam-acts.js', '/assets/js/pals-cam-more.js', '/assets/js/pals-cam-tricks.js', '/assets/js/pals-cam.js'];
  var palCamP = null;
  function loadScript(src) { return new Promise(function (ok, no) { var s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = no; document.head.appendChild(s); }); }
  function loadPalCam() {
    if (window.TOLPalsCam) return Promise.resolve(window.TOLPalsCam);
    if (!palCamP) {
      palCamP = PALCAM_FILES.reduce(function (p, src) { return p.then(function () { return src === PALCAM_FILES[0] && window.TOLPups ? null : loadScript(src); }); }, Promise.resolve())
        .then(function () { return window.TOLPalsCam; });
      palCamP.catch(function () { palCamP = null; });
    }
    return palCamP;
  }
  window.TOLPalCam = {
    load: loadPalCam,
    open: function (opts) { return loadPalCam().then(function (c) { if (c) c.open(opts || {}); }); },
    invite: function () { return loadScript('/assets/js/pals-cam-invite.js').then(function () { if (window.TOLPalCamInvite) window.TOLPalCamInvite.show(true); }); }
  };
  function palCamHooks(body) {
    Array.prototype.forEach.call(document.querySelectorAll('[data-palcam-row][hidden]'), function (r) { r.hidden = false; });
    var top = document.querySelector('main [data-palcam-top]'); // the home page's link stays first, above anything added to the top of main
    var intro = document.querySelector('main [data-home-intro]'); // the one-line "what this is" stays at the very top, then the pal cam link
    var anchorEl = intro ? intro.nextElementSibling : (top && top.parentNode.firstElementChild);
    if (anchorEl && anchorEl.classList.contains('tol-puddles-hi')) anchorEl = anchorEl.nextElementSibling; // Professor Puddles stays just above it
    if (top && anchorEl !== top) top.parentNode.insertBefore(top, anchorEl);
    var pudHi = document.querySelector('main .tol-puddles-hi'); if (top && pudHi && pudHi.nextElementSibling !== top) top.parentNode.insertBefore(pudHi, top);
    // tell the garden behind the page where the "Check in" button is, so the dogs step out of view there instead of running through it
    var avoidQ = 0;
    function avoidNow() {
      avoidQ = 0;
      var gf = document.querySelector('iframe.tol-garden-bg'), btn = document.querySelector('[data-palcam-row]:not([hidden]) .pc-launch');
      if (!gf || !gf.contentWindow) return;
      if (!gf.__tolAvoid) { gf.__tolAvoid = 1; gf.addEventListener('load', avoidNow); }
      var r = btn ? btn.getBoundingClientRect() : null, on = !!(r && r.width && r.bottom > 0 && r.top < window.innerHeight);
      try { gf.contentWindow.postMessage({ tolAvoid: on ? { l: r.left - 24, t: r.top - 20, r: r.right + 24, b: r.bottom + 20 } : null }, location.origin); } catch (e) {}
    }
    function avoidSoon() { if (!avoidQ) avoidQ = requestAnimationFrame(avoidNow); }
    if (document.querySelector('[data-palcam-row] .pc-launch')) {
      window.addEventListener('scroll', avoidSoon, { passive: true }); window.addEventListener('resize', avoidSoon);
      [0, 600, 1500, 4000].forEach(function (ms) { setTimeout(avoidNow, ms); });
    }
    document.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-palcam-open]');
      if (!b || window.TOLPalsCam) return; // on the Journey pages the cam handles its own buttons
      e.preventDefault(); window.TOLPalCam.open({ opener: b });
    });
    // the invitation: about 1 in 4 page views, 15-40 s in, once a visit, never two page views running
    var p = location.pathname, force = /[?&]palcam-pop=1\b/.test(location.search);
    var skip = /^\/(frequency-journey(-play)?\.html|calm-visualizer\.html|ask\.html|privacy-policy\.html|refund-policy\.html|terms-of-service\.html|offline\.html|404\.html)$/.test(p) ||
      /^\/(workpapers\/fill|legal)\//.test(p) || body.classList.contains('is-game') || !!document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    if (!force && (sensitivePage() || calmDevice())) return; // not on the tender reading pages, nor for a device that asks for less motion
    if (skip || helpersHidden() || (busyPage() && !/[?&]palcam-pop=1\b/.test(location.search))) return;
    // calm first: never on reading pages, and at most once every three days
    if (!force && (document.querySelector('main.read') || Date.now() - (+lsGet('tol-palcam-pop-last') || 0) < 3 * 864e5)) return;
    var prev = lsGet('tol-palcam-pop-prev'); lsSet('tol-palcam-pop-prev', '0');
    if (!force && (ssGet('tol-palcam-pop') || prev === '1' || Math.random() >= 0.25)) return;
    function still() { return !!(window.TOLStill && window.TOLStill.on()); }
    if (force) { setTimeout(function () { if (!still()) window.TOLPalCam.invite(); }, 1200); return; }
    // like the weather pill: not in the first minute of reading, unless they've scrolled a real way
    // down and been here 15 s; never in "Keep the page still" mode (pals-cam-invite.js also waits for
    // the weather pill and the home-screen invite to be gone)
    var t0 = Date.now(), done = false, timer = null;
    function go() { if (done || still() || busyPage()) return; done = true; clearTimeout(timer); window.removeEventListener('scroll', onScroll); lsSet('tol-palcam-pop-last', String(Date.now())); window.TOLPalCam.invite(); }
    function onScroll() { if (window.scrollY > window.innerHeight && Date.now() - t0 > 15000) go(); }
    window.addEventListener('scroll', onScroll, { passive: true });
    timer = setTimeout(go, 60000 + Math.random() * 30000);
  }

  // ---------- Breathe ----------
  // The button is on every page; the break itself (methods, guidance and soundscapes) lives in
  // breathe.js and loads the first time someone taps it.
  function buildBreathe(body) {
    var moon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" fill="#F9D9B8" stroke="#8A7BB8" stroke-width="1.4"/></svg>';
    var btn = el('button', { type: 'button', class: 'tol-breathe-btn', 'aria-haspopup': 'dialog' }, moon + '<span>Breathe</span>');
    btn.setAttribute('aria-label', 'Breathe: take a breathing break');
    body.appendChild(btn);
    keepBreatheClear(btn);
    var loading = false;
    btn.addEventListener('click', function () {
      if (window.TOLBreathe) { window.TOLBreathe.open(); return; }
      if (loading) return; loading = true;
      var sc = document.createElement('script'); sc.src = '/assets/js/breathe.js';
      sc.onload = function () { loading = false; if (window.TOLBreathe) window.TOLBreathe.open(); };
      sc.onerror = function () { loading = false; };
      document.head.appendChild(sc);
    });
  }

  // The floating Breathe button never sits on a form field or a button: on pages with forms it's a small
  // round picture, it rises above a sticky bottom bar (a workpaper's Save / PDF bar), it steps aside while
  // someone is typing, and if something you can tap is under it, it moves to a free corner.
  function keepBreatheClear(btn) {
    var FIELDS = 'input:not([type=hidden]):not([type=checkbox]):not([type=radio]), textarea, select';
    var TAPPABLE = 'input, textarea, select, button, label, summary, [role="button"], [contenteditable="true"], .tol-btn';
    var main = document.querySelector('main') || document.body;
    function formPage() { // a page that's mostly a form (a sign-up box doesn't count)
      var n = Array.prototype.filter.call(main.querySelectorAll(FIELDS), function (f) { return !f.closest('.tol-join, .tol-gate, .tol-find, [role="search"]'); }).length;
      return n >= 3 || !!document.querySelector('.wpf-bar');
    }
    function bottomBar() { // the tallest sticky bar along the bottom edge, if any
      var lift = 0;
      Array.prototype.forEach.call(document.querySelectorAll('.wpf-bar, [data-bottom-bar]'), function (b) {
        var r = b.getBoundingClientRect(), pos = getComputedStyle(b).position; if (!r.height || (pos !== 'fixed' && pos !== 'sticky')) return;
        if (r.bottom >= window.innerHeight - 2) lift = Math.max(lift, window.innerHeight - r.top);
      });
      return lift;
    }
    function under() { // is something you can tap (or type in) under the button?
      var r = btn.getBoundingClientRect(); if (!r.width) return false;
      var pts = [], g = [.06, .5, .94];
      g.forEach(function (x) { g.forEach(function (y) { pts.push([x, y]); }); });
      for (var i = 0; i < pts.length; i++) {
        var list = document.elementsFromPoint(r.left + r.width * pts[i][0], r.top + r.height * pts[i][1]) || [];
        for (var j = 0; j < list.length; j++) {
          var n = list[j];
          if (n === btn || btn.contains(n) || n.closest('.tol-breathe, .tol-wx, .pci, .tpv, .tol-join-pop, .tol-invite')) continue;
          if (n.closest(TAPPABLE) && !n.closest('.tol-bar, .tol-panel, .tol-set')) return true;
        }
      }
      return false;
    }
    var spots = ['', 'is-left', 'is-high', 'is-high is-left'], ALL = ['is-left', 'is-high', 'is-hiding'], queued = false;
    function place() {
      queued = false;
      if (btn.classList.contains('is-away')) return;
      btn.classList.remove('is-hiding');
      // on a phone it's a small round button (just the moon), so it covers as little of the page as possible
      var phone = window.innerWidth <= 560;
      btn.classList.toggle('is-compact', phone || formPage());
      var lift = bottomBar();
      btn.style.setProperty('--tol-br-lift', lift ? Math.round(lift + 10) + 'px' : '');
      if (!lift) btn.style.removeProperty('--tol-br-lift');
      // try the usual corner first, then the left corner, then up under the top bar
      // (on a phone it stays in the bottom corners rather than jumping up over what you're reading)
      for (var i = 0; i < (phone ? 2 : spots.length); i++) {
        ALL.forEach(function (c) { btn.classList.remove(c); });
        if (spots[i]) spots[i].split(' ').forEach(function (c) { btn.classList.add(c); });
        if (!under()) return;
      }
      // every corner is busy (a packed form on a small screen): it waits out of the way, and comes back
      // as soon as a scroll frees a corner (unless it has focus, so a keyboard user never loses it)
      ALL.forEach(function (c) { btn.classList.remove(c); });
      if (document.activeElement !== btn) btn.classList.add('is-hiding');
    }
    function queue() { if (!queued) { queued = true; requestAnimationFrame(place); } }
    window.addEventListener('scroll', queue, { passive: true });
    window.addEventListener('resize', queue);
    // typing: step aside until the field is left
    document.addEventListener('focusin', function (e) {
      var t = e.target;
      if (t && t.matches && t.matches(FIELDS) && !t.closest('.tol-breathe, .tol-bar, .tol-panel, .tol-set')) btn.classList.add('is-away');
    });
    document.addEventListener('focusout', function () {
      setTimeout(function () {
        var a = document.activeElement;
        if (!(a && a.matches && a.matches(FIELDS))) { btn.classList.remove('is-away'); queue(); }
      }, 250);
    });
    setTimeout(queue, 400); setTimeout(queue, 2500);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(queue);
  }

  // ---------- Membership ----------
  function norm(e) { return String(e || '').trim().toLowerCase(); }
  function hashEmail(email) {
    if (!(window.crypto && crypto.subtle)) return Promise.reject(new Error('insecure'));
    var data = new TextEncoder().encode('tol:' + norm(email));
    return crypto.subtle.digest('SHA-256', data).then(function (buf) {
      return Array.prototype.map.call(new Uint8Array(buf), function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
    });
  }
  var membersP = null;
  function loadMembers() {
    if (!membersP) {
      membersP = fetch(CONFIG.membersFile, { cache: 'no-store' })
        .then(function (r) { if (!r.ok) throw new Error('missing'); return r.json(); })
        .then(function (d) { return d.members || []; });
    }
    return membersP;
  }
  // Resolves to true / false; rejects if the list can't be read
  function checkEmail(email) {
    return Promise.all([loadMembers(), hashEmail(email)]).then(function (r) {
      return r[0].indexOf(r[1]) !== -1;
    });
  }

  function applyState(member) {
    isMember = member;
    document.body.classList.toggle('unlocked', member);
    // once signed up, the header says nothing about it (anyone glancing at the screen would see it);
    // the menu panel keeps a plain "Membership" link
    memberLinks.forEach(function (a) {
      a.textContent = CONFIG.openAll ? 'Email updates' : member ? 'Membership' : (CONFIG.freePreview ? 'Join free' : 'Join');
      a.classList.toggle('is-member', member);
      if (a === memberLink) a.hidden = member;
    });
    if (typeof barHeightHook === 'function') barHeightHook();
    document.querySelectorAll('.tol-gate').forEach(function (g) { g.hidden = member; });
    renderPlaceholders();
    try { document.dispatchEvent(new CustomEvent('tol-member', { detail: { member: member } })); } catch (e) {}
  }

  function signUpFree(email, msgEl) {
    function say(t, kind) { if (msgEl) { msgEl.textContent = t; msgEl.className = 'tol-msg' + (kind ? ' is-' + kind : ''); } }
    if (!/^\S+@\S+\.\S+$/.test(norm(email))) { say('Enter an email address, like name@example.com.', 'error'); return; }
    say('Signing you up…');
    var body = new URLSearchParams({ email: norm(email), embed: '1' });
    function unlock() { try { localStorage.setItem(STORE_KEY, norm(email)); } catch (e) {} }
    function done() {
      unlock();
      try { localStorage.removeItem('tol-join-pending'); } catch (e) {}
      say(CONFIG.openAll ? 'You’re on the list. We’ll send a short note when something new ships. The newsletter may send a confirmation email first; confirming keeps you on it.' : 'You’re signed up. Every page on the site is now open in this browser. The newsletter may send a confirmation email; confirming keeps you on the update list.', 'ok');
      applyState(true);
    }
    // The newsletter couldn't be reached (offline, blocked, or the service is down). Everything still
    // opens on this device, as promised, but we say so plainly and offer another try.
    function failed() {
      unlock();
      try { localStorage.setItem('tol-join-pending', '1'); } catch (e) {}
      function warn(box) {
        box.className = 'tol-msg is-warn';
        box.innerHTML = 'We couldn’t reach the newsletter just now, so you’re not on the update list yet. ' + (CONFIG.openAll ? '' : 'Everything is open on this device anyway. ') + 'Try joining again later. ';
        var again = el('button', { type: 'button', class: 'tol-msg-retry' }, 'Try joining again');
        again.addEventListener('click', function () { signUpFree(email, box); });
        box.appendChild(again);
      }
      if (msgEl) warn(msgEl);
      applyState(true);
      // the form it came from may be tucked away now that everything is open: keep the note in view
      if (!msgEl || !msgEl.getClientRects().length) {
        var note = document.querySelector('.tol-join-note') || el('p', { class: 'tol-join-note', role: 'status' });
        warn(note); note.classList.add('tol-join-note');
        var from = msgEl && msgEl.closest('.tol-gate, form'), main = document.querySelector('main');
        if (!note.parentNode) { if (from) from.after(note); else if (main) main.appendChild(note); else document.body.appendChild(note); }
      }
    }
    if (navigator.onLine === false) { failed(); return; }
    // The newsletter service doesn't let other sites read its reply, so a request that arrives counts as
    // signed up; a request that can't be sent at all (a network error) is told truthfully
    var timer = null, settled = false;
    function once(f) { return function () { if (settled) return; settled = true; clearTimeout(timer); f(); }; }
    var ok = once(done), bad = once(failed);
    timer = setTimeout(bad, 12000);
    fetch(CONFIG.signupUrl, { method: 'POST', mode: 'no-cors', body: body }).then(ok, bad);
  }

  function signIn(email, msgEl) {
    if (CONFIG.freePreview) { signUpFree(email, msgEl); return; }
    function say(t, kind) { if (msgEl) { msgEl.textContent = t; msgEl.className = 'tol-msg' + (kind ? ' is-' + kind : ''); } }
    if (!/^\S+@\S+\.\S+$/.test(norm(email))) { say('Enter the email address you used on Gumroad.', 'error'); return; }
    say('Checking…');
    checkEmail(email).then(function (ok) {
      if (ok) {
        try { localStorage.setItem(STORE_KEY, norm(email)); } catch (e) {}
        say('Unlocked. Every members page on the site is now open in this browser.', 'ok');
        applyState(true);
      } else {
        say('That email isn’t on the members list yet. If you just subscribed, your access is usually added within a day. Questions? Email ' + CONFIG.supportEmail, 'error');
      }
    }).catch(function (err) {
      say(err && err.message === 'insecure'
        ? 'Sign-in needs the secure (https) version of the site.'
        : 'The members list couldn’t be loaded. Check your connection and try again.', 'error');
    });
  }

  function signOut() {
    try { localStorage.removeItem(STORE_KEY); } catch (e) {}
    applyState(false);
  }

  function gateMarkup(compact) {
    var g = el('div', { class: 'tol-gate', role: 'region', 'aria-label': 'Members-only content' });
    if (CONFIG.freePreview) {
      g.innerHTML =
        '<h2>Free while it’s being built</h2>' +
        '<p>Everything on this site is free during development. Enter your email to open every chapter, workpaper and tool. You’ll also get a short note when something new ships. Paid membership is coming later; nothing is charged now.</p>' +
        (compact ? '' : '<div class="tol-actions"><a class="tol-btn is-quiet" href="/is-this-for-you.html">Is this right for you?</a></div>') +
        '<form class="tol-signin" novalidate>' +
          '<label for="tol-email-' + Math.random().toString(36).slice(2, 7) + '">Email address</label>' +
          '<div class="tol-field"><input type="email" autocomplete="email" placeholder="name@example.com" required>' +
          '<button class="tol-btn" type="submit">Open everything free</button></div>' +
          '<p class="tol-msg" aria-live="polite"></p>' +
        '</form>' +
        '<p class="tol-fine">Held by Buttondown and used only for program updates. Unsubscribe from any email. <a href="/legal/privacy-policy.html">Privacy policy</a></p>';
      var lab0 = g.querySelector('label'), inp0 = g.querySelector('input');
      inp0.id = lab0.getAttribute('for');
      g.querySelector('form').addEventListener('submit', function (e) {
        e.preventDefault(); signIn(inp0.value, g.querySelector('.tol-msg'));
      });
      return g;
    }
    g.innerHTML =
      '<h2>This part is for members</h2>' +
      '<p>Membership is ' + CONFIG.price + ' and opens every chapter, workpaper, and tool on this site. Cancel any time from your Gumroad library.</p>' +
      '<div class="tol-actions"><a class="tol-btn" data-tol-join href="' + CONFIG.joinUrl + '">Join for ' + CONFIG.price + '</a>' +
      (compact ? '' : '<a class="tol-btn is-quiet" href="/membership.html">What’s included</a>') + '</div>' +
      '<form class="tol-signin" novalidate>' +
        '<label for="tol-email-' + Math.random().toString(36).slice(2, 7) + '">Already a member? Enter the email you subscribed with.</label>' +
        '<div class="tol-field"><input type="email" autocomplete="email" placeholder="you@example.com" required>' +
        '<button class="tol-btn" type="submit">Unlock</button></div>' +
        '<p class="tol-msg" aria-live="polite"></p>' +
      '</form>';
    var lab = g.querySelector('label'), inp = g.querySelector('input');
    inp.id = lab.getAttribute('for');
    g.querySelector('form').addEventListener('submit', function (e) {
      e.preventDefault(); signIn(inp.value, g.querySelector('.tol-msg'));
    });
    return g;
  }

  function installGates() {
    if (CONFIG.openAll || !(here && here.paid)) return;
    var locked = document.querySelectorAll('.locked-section');
    if (!locked.length) {
      // Page marked paid but has no locked markup: lock everything after its first block
      var host = document.querySelector('main, .container, .sheet') || document.body;
      var kids = Array.prototype.filter.call(host.children, function (c) {
        // The simple/full version bar must never be locked away
        return !/^tol-/.test(c.className || '') && !/\bdepth-bar\b/.test(c.className || '') &&
               c.id !== 'tol-main' && c.tagName !== 'SCRIPT';
      });
      if (kids.length > 1) {
        var wrap = el('div', { class: 'locked-section' });
        var anchorEl = host.querySelector(':scope > .depth-bar') || kids[0];
        anchorEl.after(wrap);
        kids.slice(1).forEach(function (k) { wrap.appendChild(k); });
        locked = [wrap];
      }
    }
    if (locked.length) {
      var g = gateMarkup(false);
      g.hidden = isMember;
      locked[0].parentNode.insertBefore(g, locked[0]);
    }
  }

  // ---------- Placeholders pages can use ----------
  function renderPlaceholders() {
    document.querySelectorAll('[data-tol="contents"]').forEach(function (n) {
      n.innerHTML = ''; n.appendChild(buildIndex({ page: true, all: n.hasAttribute('data-all'), h: n.hasAttribute('data-all') ? 'h2' : 'h3' }));
    });
    document.querySelectorAll('[data-tol="members-list"]').forEach(function (n) {
      var html = '';
      SECTIONS.forEach(function (s) {
        var paid = s.items.filter(function (i) { return i.paid; });
        if (!paid.length) return;
        html += '<h3>' + esc(s.title) + '</h3><ul>' + paid.map(function (i) {
          return '<li><a href="' + i.href + '">' + esc(label(i)) + '</a>' + (i.note ? ' <span class="tol-note">' + esc(i.note) + '</span>' : '') + '</li>';
        }).join('') + '</ul>';
      });
      n.innerHTML = html;
    });
    document.querySelectorAll('[data-tol="account"]').forEach(function (n) {
      n.innerHTML = '';
      if (isMember) {
        var email = ''; try { email = localStorage.getItem(STORE_KEY) || ''; } catch (e) {}
        var box = el('div', { class: 'tol-gate' });
        box.innerHTML = (CONFIG.freePreview
          ? '<h2>You’re signed up</h2><p>Every page is open in this browser for <strong>' + esc(email) +
            '</strong>. On another device, enter the same email there.</p>'
          : '<h2>You’re signed in</h2><p>Members pages are open in this browser for <strong>' + esc(email) +
            '</strong>. To use another device, sign in there with the same email.</p>') +
          '<div class="tol-actions"><a class="tol-btn" href="/contents.html">Go to all pages</a>' +
          '<button class="tol-btn is-quiet" type="button">Sign out of this browser</button></div>';
        box.querySelector('button').addEventListener('click', signOut);
        n.appendChild(box);
      } else {
        var g = gateMarkup(true);
        g.querySelector('h2').textContent = CONFIG.freePreview ? 'Open everything free' : 'Join or sign in';
        n.appendChild(g);
      }
    });
    document.querySelectorAll('[data-tol-join]').forEach(function (a) { a.href = CONFIG.joinUrl; });
    // Plain sign-up forms on a page (<form data-tol-signup>): sign up and open everything in one step
    document.querySelectorAll('form[data-tol-signup]').forEach(function (f) {
      if (f.dataset.tolBound) return; f.dataset.tolBound = '1';
      var msg = f.querySelector('.tol-msg');
      if (!msg) { msg = el('p', { class: 'tol-msg', 'aria-live': 'polite' }); f.appendChild(msg); }
      f.addEventListener('submit', function (e) {
        e.preventDefault(); signIn(f.querySelector('input[type="email"]').value, msg);
      });
    });
    // while everything is open, "member" here just means "already left an email for updates"
    var signed = CONFIG.openAll ? !!lsGet(STORE_KEY) : isMember;
    document.querySelectorAll('[data-tol-if-member]').forEach(function (n) { n.hidden = !signed; });
    document.querySelectorAll('[data-tol-if-guest]').forEach(function (n) { n.hidden = signed; });
    document.querySelectorAll('[data-tol-price]').forEach(function (s) { s.textContent = CONFIG.price; });
    document.querySelectorAll('[data-tol-support]').forEach(function (a) {
      a.href = 'mailto:' + CONFIG.supportEmail; a.textContent = CONFIG.supportEmail;
    });
  }

  // ---------- Share ----------
  // One share feature for the whole site. TOLShare.share({ title, text, url }) opens the device's own share
  // menu where there is one (navigator.share); otherwise a small share sheet: Copy link, Text message, Email
  // and plain share links (WhatsApp, Facebook, X, Pinterest) that open in a new tab. No third-party scripts,
  // nothing added to the link, and nothing is sent from this site.
  //   url: omitted → this page (without its query or #); false → share the text alone (no link)
  //   result: true → the person's own words (a statement, a message): the sheet shows exactly what goes,
  //           offers "Copy message", and leaves out Facebook and Pinterest (they only carry a link)
  //   pin: true → offer Pinterest (pages with a picture worth pinning)
  // Any element with data-share (and optional data-share-title / -text / -url, data-share-from="#id" to share
  // that element's text, data-share-result) is a share button. <body data-no-share> keeps the automatic
  // "Share this page" button off a page. A successful share or copy fires 'tol:shared' on document
  // and 'tol-shared' (detail: { url, method, how }). Buttons made here carry class tol-share-btn and are offered to TOLShareClip.
  var shareBox = null, shareLast = null, shareCur = null;
  function shareUrl(u) {
    if (u === false || u === '') return '';
    if (u == null) return location.origin + location.pathname;
    try { return new URL(u, location.href).href; } catch (e) { return String(u); }
  }
  function shareFire(url, method) {
    // both spellings: 'tol:shared' and 'tol-shared' (the paperclip listens for the second, reading detail.how)
    ['tol:shared', 'tol-shared'].forEach(function (name) {
      try { document.dispatchEvent(new CustomEvent(name, { detail: { url: url, method: method, how: method } })); } catch (e) {}
    });
  }
  function shareCopy(text) {
    function fallback() {
      var ta = document.createElement('textarea'), ok = false;
      ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.top = '0'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { ok = document.execCommand('copy'); } catch (e) {}
      ta.remove(); return ok;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return fallback(); });
    return Promise.resolve(fallback());
  }
  function shareMessage(d) { return [d.text, d.url].filter(Boolean).join('\n'); }
  function shareMount(btn) {
    if (!btn.classList.contains('tol-share-btn')) btn.classList.add('tol-share-btn');
    try { if (window.TOLShareClip && window.TOLShareClip.mount) window.TOLShareClip.mount(btn); } catch (e) {}
    return btn;
  }
  function buildShareSheet() {
    var box = el('div', { class: 'tol-sharesheet tol-plain no-bubble', 'data-share-sheet': '', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'tol-share-h', hidden: '' },
      '<div class="tol-share-card">' +
        '<div class="tol-share-head"><h2 id="tol-share-h">Share</h2><button type="button" class="tol-share-close">Close</button></div>' +
        '<p class="tol-share-what"></p>' +
        '<p class="tol-share-preview" hidden></p>' +
        '<div class="tol-share-acts">' +
          '<button type="button" class="tol-share-act" data-act="copy">Copy link</button>' +
          '<button type="button" class="tol-share-act" data-act="copy-text">Copy message</button>' +
          '<a class="tol-share-act" data-act="sms">Text message</a>' +
          '<a class="tol-share-act" data-act="email">Email</a>' +
          '<a class="tol-share-act" data-act="whatsapp" target="_blank" rel="noopener noreferrer">WhatsApp</a>' +
          '<a class="tol-share-act" data-act="facebook" target="_blank" rel="noopener noreferrer">Facebook</a>' +
          '<a class="tol-share-act" data-act="x" target="_blank" rel="noopener noreferrer">X</a>' +
          '<a class="tol-share-act" data-act="pinterest" target="_blank" rel="noopener noreferrer">Pinterest</a>' +
          '<button type="button" class="tol-share-act" data-act="print">Print this page</button>' +
        '</div>' +
        '<p class="tol-share-status" role="status" aria-live="polite"></p>' +
        '<p class="tol-share-note">Sharing opens your own app. Nothing is sent from this site.</p>' +
      '</div>');
    box.addEventListener('click', function (e) {
      if (e.target === box) { closeShareSheet(); return; }
      var a = e.target.closest('[data-act]'); if (!a || !shareCur) return;
      var act = a.getAttribute('data-act'), st = box.querySelector('.tol-share-status');
      if (act === 'copy' || act === 'copy-text') {
        var orig = a.getAttribute('data-label') || a.textContent; a.setAttribute('data-label', orig);
        shareCopy(act === 'copy' ? shareCur.url : shareMessage(shareCur)).then(function (ok) {
          a.textContent = ok ? 'Copied!' : orig;
          st.textContent = ok ? (act === 'copy' ? 'Link copied. Paste it wherever you like.' : 'Message copied. Paste it wherever you like.') : 'Couldn’t copy here. Try selecting the link by hand.';
          clearTimeout(a._t); a._t = setTimeout(function () { a.textContent = orig; }, 2000);
          if (ok) shareFire(shareCur.url, act);
        });
        return;
      }
      if (act === 'print') { closeShareSheet(); setTimeout(function () { window.print(); }, 120); return; }
      shareFire(shareCur.url, act);   // the person's own app takes it from here
      if (act === 'sms' || act === 'email') setTimeout(closeShareSheet, 400);
    });
    box.querySelector('.tol-share-close').addEventListener('click', closeShareSheet);
    box.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeShareSheet(); return; }
      if (e.key !== 'Tab') return;
      var f = Array.prototype.filter.call(box.querySelectorAll('button, a[href]'), function (n) { return n.getClientRects().length > 0; });
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    document.body.appendChild(box);
    return box;
  }
  function openShareSheet(d) {
    if (!shareBox) shareBox = buildShareSheet();
    shareCur = d; shareLast = document.activeElement;
    var box = shareBox, enc = encodeURIComponent, msg = shareMessage(d);
    box.querySelector('#tol-share-h').textContent = d.result ? 'Share what you made' : 'Share';
    box.querySelector('.tol-share-what').textContent = d.title || '';
    box.querySelector('.tol-share-what').hidden = !d.title;
    var pv = box.querySelector('.tol-share-preview');
    pv.hidden = !d.result || !d.text; pv.textContent = d.result ? (d.text.length > 600 ? d.text.slice(0, 600) + '…' : d.text) : '';
    box.querySelector('.tol-share-status').textContent = '';
    var img = '', og = document.querySelector('meta[property="og:image"]'); if (og) img = og.getAttribute('content') || '';
    var links = {
      sms: 'sms:?&body=' + enc(msg),
      email: 'mailto:?subject=' + enc(d.title || 'Something to share') + '&body=' + enc(msg),
      whatsapp: 'https://wa.me/?text=' + enc(msg),
      facebook: d.url ? 'https://www.facebook.com/sharer/sharer.php?u=' + enc(d.url) : '',
      x: msg.length <= 260 ? 'https://x.com/intent/post?text=' + enc(d.text || d.title || '') + (d.url ? '&url=' + enc(d.url) : '') : '',
      pinterest: d.url && d.pin && img ? 'https://www.pinterest.com/pin/create/button/?url=' + enc(d.url) + '&media=' + enc(img) + '&description=' + enc(d.text || d.title || '') : ''
    };
    Array.prototype.forEach.call(box.querySelectorAll('[data-act]'), function (a) {
      var act = a.getAttribute('data-act'), show;
      if (act === 'copy') show = !!d.url;
      else if (act === 'copy-text') show = !!(d.result && d.text);
      else if (act === 'facebook' || act === 'pinterest') show = !d.result && !!links[act];
      else if (act === 'print') show = !d.result && !!d.url && d.url.split('#')[0] === location.origin + location.pathname;   // this page, not something typed
      else show = !!links[act];
      a.hidden = !show;
      if (a.hasAttribute('data-label')) { a.textContent = a.getAttribute('data-label'); }
      if (show && links[act]) a.setAttribute('href', links[act]);
    });
    box.hidden = false;
    document.documentElement.classList.add('tol-share-open');
    var firstAct = box.querySelector('[data-act]:not([hidden])') || box.querySelector('.tol-share-close');
    firstAct.focus({ preventScroll: true });
  }
  function closeShareSheet() {
    if (!shareBox || shareBox.hidden) return;
    shareBox.hidden = true; shareCur = null;
    document.documentElement.classList.remove('tol-share-open');
    if (shareLast && shareLast.focus && document.contains(shareLast)) shareLast.focus({ preventScroll: true });
  }
  function shareNow(o) {
    o = o || {};
    var d = { title: o.title || '', text: o.text || '', url: shareUrl(o.url), result: !!o.result, pin: !!o.pin };
    if (navigator.share) {
      var data = {}; if (d.title) data.title = d.title; if (d.text) data.text = d.text; if (d.url) data.url = d.url;
      var can = true; try { if (navigator.canShare) can = navigator.canShare(data); } catch (e) { can = true; }
      if (can) {
        try {
          return Promise.resolve(navigator.share(data)).then(function () { shareFire(d.url, 'native'); return { method: 'native' }; }, function (err) {
            if (err && err.name === 'AbortError') return null;    // they closed their share menu: nothing more to do
            openShareSheet(d); return { method: 'sheet' };
          });
        } catch (e) { /* fall through to the sheet */ }
      }
    }
    openShareSheet(d);
    return Promise.resolve({ method: 'sheet' });
  }
  function shareFromEl(n) {
    var from = n.getAttribute('data-share-from'), src = from ? document.querySelector(from) : null, text = n.getAttribute('data-share-text') || '';
    if (src) text = ('value' in src && src.tagName !== 'BUTTON' ? src.value : src.textContent || '').trim();
    var u = n.hasAttribute('data-share-url') ? n.getAttribute('data-share-url') : null;
    if (u === 'none') u = false;
    return { title: n.getAttribute('data-share-title') || '', text: text, url: u, result: n.hasAttribute('data-share-result'), pin: n.hasAttribute('data-share-pin') };
  }
  document.addEventListener('click', function (e) {
    var n = e.target.closest && e.target.closest('[data-share]');
    if (!n || n.closest('.tol-sharesheet')) return;
    e.preventDefault();
    var o = shareFromEl(n), dyn = n._tolShare;
    if (typeof dyn === 'function') { var x = dyn(); if (x) Object.keys(x).forEach(function (k) { o[k] = x[k]; }); }
    shareNow(o);
  });
  // a share button: label, and either fixed data or a function that makes it at tap time
  function shareButton(label, o, cls) {
    var b = el('button', { type: 'button', class: 'tol-share-btn' + (cls ? ' ' + cls : ''), 'data-share': '' },
      '<span class="tol-share-ic" aria-hidden="true"></span><span class="tol-share-t"></span>');
    b.querySelector('.tol-share-t').textContent = label;
    if (typeof o === 'function') b._tolShare = o;
    else if (o) {
      if (o.title) b.setAttribute('data-share-title', o.title);
      if (o.text) b.setAttribute('data-share-text', o.text);
      if (o.url != null) b.setAttribute('data-share-url', o.url === false ? 'none' : o.url);
      if (o.result) b.setAttribute('data-share-result', '');
      if (o.pin) b.setAttribute('data-share-pin', '');
    }
    return b;
  }
  window.TOLShare = {
    share: shareNow,
    open: function (o) { o = o || {}; openShareSheet({ title: o.title || '', text: o.text || '', url: shareUrl(o.url), result: !!o.result, pin: !!o.pin }); },
    close: closeShareSheet,
    copy: shareCopy,
    // TOLShare.button('Share', { title, text, url } or function () { return {...}; }) → a ready button
    button: function (label, o, cls) { return shareMount(shareButton(label, o, cls)); }
  };

  // ---- where a "Share" button sits on its own: content pages, the tools (the link only), kids' pages and games ----
  var SHARE_BLURB = 'Free, kind tools for sharing the load at home.';
  var SHARE_PAGES = [
    [/^\/book\/(preface|chapter-\d)\.html$/, 'Share this chapter', 'A chapter from a free, kind guide to sharing the mental load at home.'],
    [/^\/grandparents\.html$/, 'Share this guide', 'A free, kind guide for grandparents who help with the grandkids.'],
    [/^\/(friends|more-than-two|gaming-and-time-together|money-together|foster-and-kinship|adhd-kids|grown-up-children|coming-home|different-hours|two-faiths|coming-out|on-my-own|for-counselors|sharing-a-room|empty-nest|family-rifts|when-one-is-ill)\.html$/, 'Share this guide', 'A free, kind guide with words you can use. It doesn’t blame anyone, and there’s nothing to sign up for.'],
    [/^\/chore-chart-for-couples\.html$/, 'Share this guide', 'A free, printable chore chart with one owner per job.', { pin: true }],
    [/^\/(how-to-stop-fighting-with-your-partner|pursue-withdraw)\.html$/, 'Share this page', 'A free, calm guide for when we keep ending up in the same fight. It doesn’t blame either of us.'],
    [/^\/check-ins\.html$/, 'Share this guide', 'A free guide to talking about something tender, kindly, at a time that suits us both.'],
    [/^\/turning-toward\.html$/, 'Share this page', 'Small daily ways to turn toward each other. Free, no account.'],
    [/^\/long-distance\.html$/, 'Share this guide', 'A free guide for couples living apart: calls, time zones and short texts.'],
    [/^\/retired-together\.html$/, 'Share this guide', 'A free guide for when you’re both retired and home all day.'],
    [/^\/family-obligations\.html$/, 'Share this guide', 'A free guide to supporting family and sending money home, planned together.'],
    [/^\/neurodivergent-relationships\.html$/, 'Share this guide', 'A free, kind guide for couples who are wired differently. Neither way is wrong.'],
    [/^\/(invisible-labor-mental-load|communication-style-quiz)\.html$/, 'Share this guide', 'A free, kind guide to sharing the mental load at home.'],
    [/^\/library\.html$|^\/library\/[a-z-]+\.html$/, 'Share this page', 'Plain-language reading on how people think, feel and get along. Free.'],
    [/^\/learn\/index\.html$/, 'Share these stories', 'Short stories from philosophy, in plain words. Free.'],
    [/^\/whats-new\.html$/, 'Share this page', 'What’s new on Spread Love & Acceptance, a free site about sharing the load kindly.'],
    [/^\/infographic\.html$/, 'Share this page', 'The whole idea on one page: a free, kind way to share the load at home.', { pin: true }],
    [/^\/(five-pillars|how-it-works|polymath|start-here|start-in-10-minutes|frequency-framework|turning-toward|check-ins|wired-differently|relationships|is-this-for-you|glossary)\.html$/, 'Share this page', SHARE_BLURB],
    // tools: the link to the tool, never anything typed into it
    [/^\/signal-translator\.html$/, 'Share this tool', 'A free tool to test how a sentence might land before you say it.'],
    [/^\/perspective-shifter\.html$/, 'Share this tool', 'A free tool for seeing a moment from the other person’s side.'],
    [/^\/lemonade-stand\.html$/, 'Share this tool', 'A free, friendly way to see who does what at home.'],
    [/^\/conversation-reader\.html$/, 'Share this tool', 'A free tool for reading a tricky conversation more calmly.'],
    [/^\/wavelength\.html$/, 'Share this tool', 'Find your Wave Code: a free, friendly look at how you think, talk and listen.'],
    [/^\/tools\/frequency-calibration\.html$/, 'Share this tool', 'A free tool for comparing your natural rhythms.'],
    [/^\/quick-checks\.html$/, 'Share this tool', 'A one-minute check on how you’re doing today. Free.'],
    [/^\/wiring-card\.html$/, 'Share this tool', 'Make a free one-page card about how you take in words.'],
    [/^\/carrier-wave-decoder\.html$/, 'Share this tool', 'A free, step-by-step guide for when a conversation starts going sideways.'],
    [/^\/workpapers\/fill\/suite\.html$/, 'Share this tool', 'Free, printable worksheets for sharing the load at home.', { url: '/workpapers/fill/suite.html' }],
    // kids and families
    [/^\/frequency-buddies\.html$/, 'Share this episode', 'Frequency Buddies: a gentle cartoon for kids and families, free, with captions.', { pin: true, episode: true }],
    [/^\/frequency-buddies-live\.html$/, 'Share the station', 'Frequency Buddies Live: a gentle cartoon station for kids and families, always on.', { pin: true }],
    [/^\/frequency-buddies-shuffle\.html$/, 'Share this page', 'Frequency Buddies on shuffle: gentle cartoon episodes for kids and families.', { pin: true }],
    [/^\/frequency-buddies-season-2\.html$/, 'Share the teaser', 'Frequency Buddies Season 2 is coming! Watch the two-minute teaser and look for the five secrets.', { pin: true }],
    [/^\/frequency-buddies-music-video[\w-]*\.html$/, 'Share the music video', 'A Frequency Buddies music video for kids and families.', { pin: true }],
    // games (the game, never a score)
    [/^\/pause-and-play\.html$/, 'Share the games', 'Calm games for a busy mind. Free, with no timers.'],
    [/^\/(word-bloom|quiet-crossword|daily-ledger-crossword|quiet-words)\.html$/, 'Share this game', 'A calm word game I like.'],
    [/^\/frequency-journey\.html$/, 'Share this game', 'A calm puzzle journey with two pups. Free.'],
    [/^\/night-garden\.html$/, 'Share the garden', 'A calm place to breathe and play. Free, with no timers.']
  ];
  function shareTitle() {
    var h = document.querySelector('main h1');
    var t = h ? h.textContent.replace(/\s+/g, ' ').trim() : '';
    return t || (document.title || '').replace(/\s*[|·–-]\s*Spread Love.*$/i, '').trim();
  }
  // the episode playing on the episodes page, by its ?ep= (or the one last watched), named from the page's own episode list
  function episodeShare() {
    var m = /[?&]ep=(s\d+e\d+)/.exec(location.search), id = m ? m[1] : null;
    if (!id) { try { id = JSON.parse(lsGet('tol-buddies-v1') || '{}').last || null; } catch (e) { id = null; } }
    if (!id) return null;
    var name = '';
    Array.prototype.some.call(document.querySelectorAll('script[type="application/ld+json"]'), function (s) {
      var hit = new RegExp('"episodeNumber":(\\d+),"name":"([^"]+)","url":"[^"]*\\?ep=' + id + '"').exec(s.textContent || '');
      if (hit) name = 'Episode ' + hit[1] + ': ' + hit[2];
      return !!hit;
    });
    return { url: location.pathname + '?ep=' + id, title: 'Frequency Buddies' + (name ? ', ' + name : ''),
      text: 'Frequency Buddies' + (name ? ', ' + name : '') + ': a gentle cartoon for kids and families, free, with captions.' };
  }
  function placeShare(body) {
    var main = document.querySelector('main');
    if (!main || body.hasAttribute('data-no-share')) return;
    var rule = null;
    SHARE_PAGES.some(function (r) { if (r[0].test(current)) { rule = r; return true; } return false; });
    // About: right beside the "please pass it on" line
    if (current === '/about.html') {
      var line = document.querySelector('.share-line');
      var ab = shareMount(shareButton('Pass it on', { title: 'Spread Love & Acceptance', text: 'A free site about sharing the load kindly, made by one person, for anyone.', url: '/index.html' }));
      var wrap = el('p', { class: 'tol-share-row is-inline tol-plain no-bubble' }); wrap.appendChild(ab);
      if (line) line.after(wrap); else main.appendChild(wrap);
      return;
    }
    if (rule) {
      var extra = rule[3] || {}, title = shareTitle();
      var opts = extra.episode ? function () { return episodeShare() || { title: title, text: rule[2], url: location.pathname }; }
        : { title: title, text: rule[2], url: extra.url, pin: !!extra.pin };
      var row = el('div', { class: 'tol-share-row tol-plain no-bubble' });
      row.appendChild(shareMount(shareButton(rule[1], opts)));
      // guides and reading pages: a plain Print button beside Share (phones open their own share menu, which has no print)
      if (/^Share this (guide|page|chapter)$/.test(rule[1]) && !document.querySelector('main [data-print], main .wk-btn#wk-print')) {
        var pb = el('button', { type: 'button', class: 'tol-print-btn' }, 'Print this page');
        pb.addEventListener('click', function () { window.print(); });
        row.appendChild(pb);
      }
      var tip = main.querySelector(':scope > .tol-tip');
      if (tip) main.insertBefore(row, tip); else main.appendChild(row);
    }
    // the glossary: each word can be shared on its own, by its #id
    if (current === '/glossary.html') {
      Array.prototype.forEach.call(document.querySelectorAll('main article.gl-term[id]'), function (a) {
        var h = a.querySelector('h3'), def = a.querySelector('.gl-def'), links = a.querySelector('.gl-links'), word = h ? h.textContent.replace(/\s+/g, ' ').trim() : '';
        if (!links || !word) return;
        var b = shareMount(shareButton('Share', { title: word + ', in plain English', text: def ? def.textContent.trim() : word, url: '/glossary.html#' + a.id }, 'is-small'));
        b.setAttribute('aria-label', 'Share the word ' + word);
        links.appendChild(document.createTextNode(' ')); links.appendChild(b);
      });
    }
    // Roots & Wings on "Where your lens came from": the tool's link only
    var roots = current === '/growing-up.html' && document.querySelector('main #roots [data-roots]');
    if (roots) {
      var rr = el('p', { class: 'tol-share-row is-inline tol-plain no-bubble' });
      rr.appendChild(shareMount(shareButton('Share this tool', { title: 'Roots & Wings', text: 'A gentle, tap-through look back at where a trait may have started. Free.', url: '/growing-up.html#roots' })));
      var rsec = roots.closest('section'); (rsec || main).appendChild(rr);
    }
    // the Season 2 teaser: the end card can share how many secrets were found (a count, nothing else)
    if (current === '/frequency-buddies-season-2.html') {
      var tries = 0;
      var addTeaser = function () {
        var row2 = document.querySelector('.tz-end .tz-row');
        if (!row2) { if (++tries < 20) setTimeout(addTeaser, 500); return; }
        if (row2.querySelector('.tol-share-btn')) return;
        row2.appendChild(shareMount(shareButton('Share', function () {
          var n = 0; try { n = (JSON.parse(lsGet('tol-fb-s2-teaser') || '{}').found || []).length; } catch (e) {}
          n = Math.max(0, Math.min(5, n));
          return { title: 'Frequency Buddies Season 2 teaser', url: '/frequency-buddies-season-2.html',
            text: n >= 5 ? 'I found all 5 secrets in the Frequency Buddies Season 2 teaser! Can you?' : n > 0 ? 'I found ' + n + ' of 5 secrets in the Frequency Buddies Season 2 teaser! Can you find them all?' : 'Five secrets are hidden in the Frequency Buddies Season 2 teaser. Can you find them?' };
        }, 'tz-b')));
      };
      addTeaser();
    }
    // buttons written into a page as plain data-share get the same look and the paperclip
    Array.prototype.forEach.call(document.querySelectorAll('[data-share]:not(.tol-share-btn)'), shareMount);
  }

  // Read-only access for pages that need the page list (e.g. 404.html)
  // Erase everything this site keeps in this browser: every local and session storage key (only this site's own
  // can be reached), the offline copies of pages, the service worker, and the analytics cookies. Used by
  // "Erase everything" on the safety page and "What's stored on this device". opts.stopRemembering keeps one
  // switch afterwards so the page list isn't started again.
  function eraseAll(opts) {
    opts = opts || {};
    try { localStorage.clear(); } catch (e) {}
    try { sessionStorage.clear(); } catch (e) {}
    if (opts.stopRemembering) lsSet('tol-recent-off', '1');
    // analytics cookies (_ga, _ga_XXXX), on this host and the parent domain
    try {
      var host = location.hostname, doms = ['', host, '.' + host.replace(/^www\./, '')];
      document.cookie.split(';').forEach(function (c) {
        var n = c.split('=')[0].trim(); if (!/^_ga/.test(n)) return;
        doms.forEach(function (d) { document.cookie = n + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/' + (d ? '; domain=' + d : ''); });
      });
    } catch (e) {}
    var jobs = [];
    try { if (window.caches && caches.keys) jobs.push(caches.keys().then(function (ks) { return Promise.all(ks.map(function (k) { return caches.delete(k); })); })); } catch (e) {}
    try { if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) jobs.push(navigator.serviceWorker.getRegistrations().then(function (rs) { return Promise.all(rs.map(function (r) { return r.unregister(); })); })); } catch (e) {}
    return Promise.all(jobs).catch(function () {});
  }
  window.TOL = { sections: SECTIONS, menu: MENU, config: CONFIG, signUp: signUpFree, isMember: function () { return isMember; }, eraseAll: eraseAll };

  // ---------- Start ----------
  function start() {
    var stored = null;
    try { stored = localStorage.getItem(STORE_KEY); } catch (e) {}
    // Returning members see content immediately; the check below confirms or revokes it
    isMember = CONFIG.openAll || !!stored;
    buildChrome();
    installGates();
    applyState(isMember);
    // not signed up yet: the "join free to unlock everything" banner on the home page and the occasional invitation elsewhere
    if (!isMember && CONFIG.freePreview && !CONFIG.openAll) { var ji = document.createElement('script'); ji.src = '/assets/js/join-invite.js'; ji.defer = true; document.head.appendChild(ji); }
    // Brain Breakers: the bold card on the home page, and a "Brain Break" card ending each program page
    var BB_PAGE = /^\/(index|start-in-10-minutes|invisible-labor-mental-load|chore-chart-for-couples|how-to-stop-fighting-with-your-partner|neurodivergent-relationships|communication-style-quiz|check-ins|turning-toward|complacency|wired-differently|love-languages|share-the-load|new-parent|co-parenting|prog-01)(-in-depth)?\.html$|^\/(book|workpapers)\/(?!fill\/)/;
    if ((current === '/index.html' || BB_PAGE.test(current)) && !workMode() && !document.querySelector('meta[http-equiv="Content-Security-Policy"]')) { var bbs = document.createElement('script'); bbs.src = '/assets/js/brain-breaks.js'; bbs.defer = true; document.head.appendChild(bbs); }
    // tablets, laptops and desktops: an "On this page" outline, keyboard shortcuts, roomier touch targets (wide-screens.js)
    { var wsc = document.createElement('script'); wsc.src = '/assets/js/wide-screens.js'; wsc.defer = true; document.head.appendChild(wsc); }
    // a very faint local time and weather note in the corner, so nobody has to leave the page to check (clock-weather.js)
    if (!workMode()) { var cwx = document.createElement('script'); cwx.src = '/assets/js/clock-weather.js'; cwx.defer = true; document.head.appendChild(cwx); }
    // phones: a "turn sideways" hint under big pictures, and full screen asks for landscape
    if (/^\/(soundscapes|frequency-buddies[a-z0-9-]*|calm-visualizer|night-garden|pal-cam-tv)\.html$/.test(current)) { var tsw = document.createElement('script'); tsw.src = '/assets/js/turn-sideways.js'; tsw.defer = true; document.head.appendChild(tsw); }
    if (location.hash) { var t = document.getElementById(location.hash.slice(1)); if (t) t.scrollIntoView(); }

    if (stored && !CONFIG.freePreview) {
      checkEmail(stored).then(function (ok) {
        if (!ok) { try { localStorage.removeItem(STORE_KEY); } catch (e) {} applyState(false); }
      }).catch(function () { /* list unreachable: leave the returning member's access alone */ });
    }
  }

  addAppMeta();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
