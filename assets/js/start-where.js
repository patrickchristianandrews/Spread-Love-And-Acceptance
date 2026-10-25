/* Start where you are — a situation chooser.
   Drop <div data-tol-start></div> on any page (optionally data-compact) and include this file.
   Nothing is stored or sent; it only routes people to the right page. */
(function () {
  var S = [
    { id:'same-fight', ico:'\uD83D\uDD01', label:'We keep having the same fight',
      say:'Then the argument probably is not about the dishes, the money or the calendar. A thing that comes back every week is usually a gap in the arrangement, and arrangements can be changed without anybody being at fault.',
      picks:[
        ['/pursue-withdraw.html','One wants to talk now, one needs space','If one of you pushes to sort it now and the other walks away, start here: both sides, and a pause plan.'],
        ['/workpapers/wp-03-one-owner-per-job.html','One owner per job','Most repeat fights live in jobs nobody formally owns.'],
        ['/workpapers/wp-04-what-keeps-coming-back.html','What keeps coming back?','Sorts what keeps going wrong into a gap in the setup, too little time or energy, or a one-off.'],
        ['/check-ins.html','Check-ins','How to raise it once, properly, instead of ten times badly.']
      ]},
    { id:'empty', ico:'\uD83E\uDEAB', label:'I am running on empty',
      say:'That deserves attention before anything else does. Nothing in the program works well from an empty tank, and you are allowed to start by looking after yourself.',
      picks:[
        ['/night-garden.html','The Night Garden','A calm place to breathe and play for a few minutes. No sign-up, nothing to lose.'],
        ['/quick-checks.html#today','Today\u2019s Weather','One minute, and it tells you what today is actually good for.'],
        ['/wp-11.html','The Calm-Down Kit','Decide now what settles you, so it is ready when it is needed.']
      ]},
    { id:'caring', ico:'\uD83D\uDC9B', label:'I\u2019m looking after someone I love',
      say:'Caring for a parent, or for a husband, wife or partner after surgery or an illness, can get heavy quietly. Start with your own battery, because you matter here too. Then try one small thing today: a one-minute break, or asking one person for one specific help, like \u201cCould you do Thursday\u2019s drive?\u201d',
      picks:[
        ['/caregivers.html','Caring for someone you love','When they can\u2019t share the load back, who else can help, and where to find respite.'],
        ['/workpapers/wp-02-how-much-are-you-carrying.html','How much are you carrying?','A quick look at how full your battery is today, before you judge the day.'],
        ['#breathe','Breathe','A one-minute calm break, right here on this page.']
      ]},
    { id:'home-bills', ico:'\uD83C\uDFE0', label:'We share a home and the bills',
      say:'Shared homes run more smoothly when everyone sees the same list. Put every job and every bill on one page, agree how the rent and bills are split, and talk about money at a set time, starting with the numbers rather than with who is late. This works with three or more people, too.',
      picks:[
        ['/share-the-load.html#roommates','Roommates: rent, bills and three or more people','A shared-expenses note, fair splits, and how to talk about money without a fight.'],
        ['/lemonade-stand.html','The Lemonade Stand','Jobs and hours side by side. Works with more than two people.'],
        ['/signal-translator.html','The Chat analyzer','Test your opening line about money before the house meeting.']
      ]},
    { id:'friends', ico:'\uD83E\uDEC2', label:'A friendship has drifted',
      say:'Friendships often drift without anyone choosing it: a move, a new baby, a busy year. It is fine to be the one who reaches out first, and it is fine to ask for a little more back. A short, warm message with no guilt in it usually does more than a long one.',
      picks:[
        ['/friends.html','Friends: when a friendship drifts','Always the one reaching out, big life changes, and low-energy ways to stay close.'],
        ['/signal-translator.html?rel=friends','Check a message first','See how a short text might land before you send it.'],
        ['/turning-toward.html?who=friend','Turning toward','Small, easy ways to stay in touch.']
      ]},
    { id:'more-than-two', ico:'\uD83D\uDC9E', label:'More than two partners at home',
      say:'Most of the tools here work for three or more people: one list, one owner per job, and a regular time to talk. Feeling like a guest in a home you joined is common, and it usually eases once you own a few whole jobs and have a say in decisions.',
      picks:[
        ['/more-than-two.html','More than two partners at home','Sharing the load, joining a home that was already running, and decisions everyone can join.'],
        ['/lemonade-stand.html','The Lemonade Stand','Jobs and hours side by side, for two to eight people.'],
        ['/check-ins.html','Check-ins','A short, regular time where everyone gets heard.']
      ]},
    { id:'gaming', ico:'\uD83C\uDFAE', label:'Gaming, phones and not enough us-time',
      say:'Games and phones are how many people relax, and wanting more time together is fair too. Neither of you is wrong. A small, clear deal about when it is game time and when it is your time usually works better than counting hours.',
      picks:[
        ['/gaming-and-time-together.html','Gaming, phones and time together','Why it stings, and a small \u201Ctime together deal\u201D you can fill in.'],
        ['/turning-toward.html','Turning toward','Small moments of attention that add up.'],
        ['/check-ins.html','Check-ins','Raise it once, calmly, at a good time.']
      ]},
    { id:'money', ico:'\uD83D\uDCB0', label:'Money, moving in, a wedding',
      say:'Money talks go better when you start with what money means to each of you, like safety or freedom, before the numbers. Different styles are normal. If one person controls all the money or checks every purchase, that is something else, and help is there.',
      picks:[
        ['/money-together.html','Money together','Saver and spender, moving in, wedding costs and family expectations.'],
        ['/lemonade-stand.html#money','Money in the Lemonade Stand','Bills and shared costs as plain numbers, never a debt between you.']
      ]},
    { id:'coming-home', ico:'\uD83E\uDDF3', label:'Someone just came home after months away',
      say:'After a deployment, a long stretch of work away or a hospital stay, both of you have changed how things run. That is nobody\u2019s fault. Handing jobs back one at a time, with patience on both sides, helps everyone find their place again.',
      picks:[
        ['/coming-home.html','Coming home after time apart','A handover week, finding your place, and where to get support.'],
        ['/workpapers/wp-03-one-owner-per-job.html','One owner per job','Decide together who owns what now.'],
        ['/check-ins.html','Check-ins','A calm, regular time to talk about how it\u2019s going.']
      ]},
    { id:'different-hours', ico:'\uD83C\uDF19', label:'We work different hours',
      say:'Night shifts, early starts, or one of you working from home can make it feel like you live on different clocks. Sleep after a night shift is not a day off, and working from home is still work. A shared plan for the week protects sleep and still finds time together.',
      picks:[
        ['/different-hours.html','Different hours','Night shifts, shift work, and when working from home looks like being free.'],
        ['/lemonade-stand.html','The Lemonade Stand','Paid work and home jobs in one picture.'],
        ['/turning-toward.html','Turning toward','Small ways to stay close when you\u2019re rarely awake at the same time.']
      ]},
    { id:'long-hours', ico:'\u23F0', label:'One of us works long hours, the other runs the home',
      say:'Long paid hours and running a home and children are both real work, and both people are usually tired. The trouble starts when one kind of work is counted and the other is invisible. Put both in one picture, then agree what the long-hours partner owns at home, even if it is small.',
      picks:[
        ['/lemonade-stand.html','Who does what (the Lemonade Stand)','Paid hours and home jobs side by side, with a switch for long hours, so nobody keeps score.'],
        ['/invisible-labor-mental-load.html','The work nobody sees','Planning, remembering and noticing count too.'],
        ['/different-hours.html','When you are rarely home at the same time','Protecting rest, and staying close on busy weeks.'],
        ['/turning-toward.html','Turning toward','Small daily moments that keep you close when time is short.']
      ]},
    { id:'read-book', ico:'\uD83D\uDCD6', label:'I\u2019d rather read: the book',
      say:'The whole book is free to read, one short chapter at a time. Part One is about you, Part Two about sharing a home and its work, and Part Three about how people work: feelings, stress, trust, change and love.',
      picks:[
        ['/book/index.html','The book, from the beginning','Every part and chapter in order.'],
        ['/book/self-1-then.html','Part One, Chapter 1: Where you came from','A gentle start on your own.'],
        ['/book/understanding-1-feelings.html','Part Three, Chapter 1: How feelings work','Naming what you feel, even if you were never taught.']
      ]},
    { id:'two-faiths', ico:'\uD83E\uDD1D', label:'Two faiths or cultures, maybe a baby on the way',
      say:'Two faiths or cultures in one family can be a gift, and a lot to work out: holidays, food, names, raising children and what each family expects. You don\u2019t have to settle everything at once. Start with what matters most to each of you, and why.',
      picks:[
        ['/two-faiths.html','Two faiths or cultures, one family','Holidays, rituals, children and family expectations, with words you could use.'],
        ['/new-parent.html','A new baby: sharing the load','Nights, feeds and the new jobs, shared so neither of you runs on empty.'],
        ['/family-obligations.html','Supporting family','Each of you leads with your own family.'],
        ['/check-ins.html','Check-ins','Hear each other out before you decide.']
      ]},
    { id:'foster', ico:'\uD83E\uDDF8', label:'We foster, adopt, or I\u2019m raising a relative\u2019s child',
      say:'Children who have moved homes often need time before they trust new adults, and that is not a sign you are doing it wrong. Calm routines, small promises kept, and support for you as the caregiver all matter.',
      picks:[
        ['/foster-and-kinship.html','Foster, adoptive and kinship families','Building trust, house rules, and support for grandparents and relatives raising a child.'],
        ['/parents.html','For parents','Big feelings, coming back after you yell, and teens.'],
        ['/caregivers.html','Looking after you, too','Where caregivers can find a break and support.']
      ]},
    { id:'raising-grandchild', ico:'\uD83D\uDC75', label:'I\u2019m raising my grandchild (or a relative\u2019s child)',
      say:'Stepping in to raise a grandchild or a relative\u2019s child is a big, loving thing, and it often comes with grief, tiredness and a lot of new rules at once. You don\u2019t have to get it all right. Calm routines, a few clear house rules, and support for you matter most.',
      picks:[
        ['/foster-and-kinship.html#kinship','Raising a grandchild or a relative\u2019s child','Being the grown-up now, the child\u2019s parents, and the rest of the family.'],
        ['/foster-and-kinship.html#rules','House rules, with the why written in','A few rules everyone can see, and the reason for each.'],
        ['/teens.html','For the teen in your home','A page written for them, not about them.']
      ]},
    { id:'grandparents', ico:'\uD83E\uDDD3', label:'Grandparents: helping with the grandchildren, and new rules with a grown-up child',
      lead:['/foster-and-kinship.html#kinship','Raising your grandchild full-time? Start here \u2192'],
      say:'When a grown-up child has a home, and maybe a baby, of their own, everyone is learning new rules: visits, advice, and who decides what. Both sides usually mean well. Clear, kind words about what helps work better than hints.',
      picks:[
        ['/grandparents.html','For grandparents','Being close to the grandchildren, offering help, and when to hold back.'],
        ['/grown-up-children.html','For grown-up children','Kind boundaries with a parent you love: visits, advice and the new baby.'],
        ['/signal-translator.html','Check a message first','Test the words before you send them.']
      ]},
    { id:'family-rifts', ico:'\uD83C\uDF09', label:'A family rift: sibling, parent or grown child',
      say:'After a loss, a will, or years of silence, a family rift can hurt for a long time. You can reach out, and you can also decide you are not ready. Both are allowed. Start small, and look after yourself whichever you choose.',
      picks:[
        ['/family-rifts.html','Family rifts','Reaching out, what to say first, and \u201CI\u2019m not ready\u201D or \u201CI don\u2019t have to\u201D.'],
        ['/grown-up-children.html','For grown-up children and parents','When a parent and an adult child need new, kinder rules: visits, advice and space.'],
        ['/grief.html','Grief and loss','Family after a loss, and reconnecting.'],
        ['/signal-translator.html','Check a first message','See how it might land before you send it.']
      ]},
    { id:'widowed', ico:'\uD83D\uDD6F', label:'I\u2019ve lost my husband, wife or partner',
      say:'I\u2019m sorry. Grief after losing a partner has no timeline, and there is no right way to do it. Go gently. Nothing here has to be done today, and you don\u2019t have to do it alone.',
      picks:[
        ['/grief.html#grief','Grief has no timetable','What grief can feel like, and what helps a little.'],
        ['/grief.html#new-chapter','A new chapter on your own','Running a home alone, and finding your feet, slowly.'],
        ['/grief.html#hard-evening-h','For a hard evening','A few small things to do when the evening is long.'],
        ['/grief.html#help','When to get more help','Who to talk to, and when.']
      ]},
    { id:'anxious', ico:'\uD83C\uDF3F', label:'Anxious or on edge today',
      say:'Anxiety is your body trying to keep you safe, a bit too hard. Start with your body, not your thoughts: one minute to see where you are, then one small step that fits.',
      picks:[
        ['/ladder.html','Where am I right now?','Four quick taps, then one calm step that fits.'],
        ['#breathe','Breathe for a minute','A short pause, right here.'],
        ['/calming-supplements.html','Calming herbs and supplements','What the research says, honestly, and what to watch out for.'],
        ['/wp-11.html','The Calm-Down Kit','Decide now what settles you, so it is ready next time.']
      ]},
    { id:'on-my-own', ico:'\uD83E\uDEB4', label:'On my own after a breakup',
      say:'After a breakup or divorce, the house, the week and the jobs all change at once. Go gently. Start with your own energy, then build a simple routine that is yours, including the days the kids are with you if you share them.',
      picks:[
        ['/on-my-own.html','On my own after a breakup','A new routine, part-time parenting, and making your place feel like home.'],
        ['/self-path.html','Your self-discovery path','Step by step, on your own.'],
        ['/co-parenting.html','Separated co-parents','If you share the kids: calmer handoffs and short messages.']
      ]},
    { id:'anger', ico:'\uD83C\uDF21\uFE0F', label:'Losing your temper?',
      say:'Wanting to stop is the biggest step. Most people can learn to catch the first sign in their body and pause before they shout. If your temper scares the people you live with, getting support for yourself is a strong, loving thing to do.',
      picks:[
        ['/upset-right-now.html','Upset right now?','Five minutes to pause, breathe and come back.'],
        ['/parents.html#anger-help','Getting help for your anger','Your doctor, a counselor or a group, and what to try first.'],
        ['/wp-11.html','The Calm-Down Kit','Write down your triggers and your own pause line ahead of time.']
      ]},
    { id:'sharing-a-room', ico:'\uD83D\uDECF\uFE0F', label:'Sharing a room or a dorm',
      say:'Sharing a room is close quarters, and small things like lights, noise and guests add up fast. A short room agreement, made early and checked again later, saves a lot of awkward moments.',
      picks:[
        ['/sharing-a-room.html','Sharing a room','Sleep, noise, guests and tidiness, with a room agreement to fill in.'],
        ['/share-the-load.html#roommates','Roommates and housemates','Chores, bills and a house meeting.'],
        ['/signal-translator.html','Check a message first','Raise it kindly before it builds up.']
      ]},
    { id:'coming-out', ico:'\uD83C\uDF08', label:'Coming out, or telling family who I love',
      say:'Coming out as an adult, to family, at work or with a partner, is yours to share at your own pace. You choose who, when and how much. If someone threatens or controls you, your safety comes first.',
      picks:[
        ['/coming-out.html','Coming out as an adult','To family, at work or with a partner, with words you could use.'],
        ['/signal-translator.html','Check a message first','Try the words before you say them.']
      ]},
    { id:'adhd-kids', ico:'\uD83C\uDF92', label:'A child with ADHD',
      say:'A child who can\u2019t sit still, forgets things or melts down is not being naughty on purpose. ADHD is a different kind of wiring. Short steps, calm reminders and noticing what goes right help the whole family.',
      picks:[
        ['/adhd-kids.html','When a child has ADHD','For parents and grandparents: routines, reminders and calm.'],
        ['/parents.html','For parents','Big feelings, siblings, and coming back after you yell.'],
        ['/neurodivergent-relationships.html','Neurodivergent families','When the grown-ups are wired differently too.']
      ]},
    { id:'illness', ico:'\uD83E\uDEF6', label:'Illness, disability or low energy',
      say:'When one of you is ill or disabled, the load is better shared by energy than by hours. Nobody here is a burden. Plan around good days and bad days, and let whoever has more energy that day carry more, without keeping score.',
      picks:[
        ['/when-one-is-ill.html','When one of you is ill','Sharing the load by energy, not hours, with ideas for bad days.'],
        ['/caregivers.html','Caring for someone you love','For the one who cares: your battery matters too.'],
        ['/turning-toward.html','Turning toward','Gentle ways to stay close, even on a day in bed.']
      ]},
    { id:'empty-nest', ico:'\uD83C\uDFE1', label:'Kids grown and gone, it feels quiet',
      say:'When the children leave, the house goes quiet and you can feel more like roommates. That is common after busy years, and it can become a good new chapter. Small daily moments of attention bring you back to each other.',
      picks:[
        ['/empty-nest.html','Kids grown and gone','When the house is quiet between you, and how to start again.'],
        ['/workpapers/wp-13-daily-check-in.html','The 90-second daily check-in','The smallest habit here, and the one that lasts.'],
        ['/turning-toward.html','Turning toward','Seven small, everyday ways to reconnect.']
      ]},
    { id:'invisible', ico:'\uD83D\uDC41', label:'Nobody sees what I do',
      say:'That is the oldest problem in this program, and the reason it exists. Work that is never seen cannot be shared, and saying "you never help" rarely makes it visible. Writing it down does.',
      picks:[
        ['/book/preface.html','The Preface','Why unseen work builds up like a debt only one person can see.'],
        ['/workpapers/wp-01.html','Who did what','The record that turns an impression into something you can both read.'],
        ['/lemonade-stand.html','The Lemonade Stand','Tasks and hours side by side, in about five minutes.']
      ]},
    { id:'went-badly', ico:'\uD83D\uDCA5', label:'A conversation just went badly',
      say:'Before you replay it another forty times: two people can both be reasonable and still end up out of tune. Working out what slipped is more useful than working out who started it.',
      picks:[
        ['/carrier-wave-decoder.html','The Carrier Wave Decoder','A guided walk back through what actually happened.'],
        ['/workpapers/wp-09-say-it-so-it-lands.html','Say it so it lands','Turns the thing you want to say into fact, feeling and ask.'],
        ['/check-ins.html','Check-ins','How to reopen it in a room that can hold it.']
      ]},
    { id:'say-hard', ico:'\u2709', label:'I need to say something hard',
      say:'Good. Saying it badly and saying nothing are both worse. It is worth testing the words first, because the same sentence lands very differently depending on who is receiving it.',
      picks:[
        ['/signal-translator.html','The Chat analyzer','Type your sentence and see where it might land badly.'],
        ['/workpapers/wp-09-say-it-so-it-lands.html','Say it so it lands','Fact, feeling, ask. Same content, far less damage.'],
        ['/check-ins.html','Check-ins','Pick the time and the room before you pick the words.']
      ]},
    { id:'past-each-other', ico:'\uD83D\uDCE1', label:'We talk past each other',
      say:'Often neither of you is being difficult. Two brains can process the same sentence differently, and the mismatch runs both ways rather than one person being wrong.',
      picks:[
        ['/wired-differently.html','Wired Differently','How fourteen kinds of wiring receive the same words.'],
        ['/wavelength.html','Wavelength','Find both of your Wave Codes and compare them, to see where to tune in on purpose.'],
        ['/wiring-card.html','Make a wiring card','Say how you receive things once, instead of every time.'],
        ['/book/chapter-1.html','Chapter I','Why reasonable people produce a squeal.']
      ]},
    { id:'know-myself', ico:'\uD83E\uDDED', label:'I want to understand myself better',
      say:'That is the half of the program you can do entirely alone, and it is the half everything else rests on. No partner, no permission, nothing to negotiate.',
      picks:[
        ['/self-path.html','Your self-discovery path','Step by step, on your own: your battery, your wiring, what settles you and kind ways to say no.'],
        ['/book/self-2-now-in-depth.html#control','Your circle of control','What is yours to do, what is theirs to decide, and how to match energy kindly.'],
        ['/wavelength.html','Wavelength','How you think, talk and listen: your wiring, your Wave Code and sixteen self-discovery chapters.'],
        ['/quick-checks.html#today','Today\u2019s Weather','Start today. Within two weeks, the almanac shows your patterns.']
      ]},
    { id:'give-too-much', ico:'\u2696', label:'I give more than I get back',
      say:'Quiet resentment, a silent scorecard and being tired before the day starts are not character flaws. They are a sign the effort has been uneven for a while. Naming it is fair, and so is asking for things to change. The tools here help you show it plainly, without blame.',
      picks:[
        ['/book/self-2-now-in-depth.html#control','Your circle of control, and matching energy','Signs you are over-giving, and how to match care and effort kindly.'],
        ['/self-path.html','Your self-discovery path','A gentle first week, including kind ways to say no.'],
        ['/workpapers/wp-02-how-much-are-you-carrying.html','How much are you carrying?','How full your battery really is today.']
      ]},
    { id:'new-baby', ico:'\uD83C\uDF7C', label:'We have a new baby',
      say:'A new baby brings a lot of new jobs, and one nobody sees: keeping track of it all. When you are both tired, that job lands on whoever notices first. Ten minutes of listing the jobs and giving each one an owner can stop it landing on one of you by accident.',
      picks:[
        ['/new-parent.html','New baby, sharing the load','Three small steps: list every job, give each one an owner, and look at it once a week.'],
        ['/lemonade-stand.html','The Lemonade Stand','Pick jobs from its task library, add your own, and see the split as a plain fact.'],
        ['/upset-right-now.html','Upset right now?','For the 2 a.m. moments when you are both running on empty.']
      ]},
    { id:'child-teen', ico:'\uD83E\uDDD2', label:'My kids fight, or I yell at them',
      say:'Kids fighting and parents yelling are both very common, and both can change. Short, calm steps work better than a big talk: stop, breathe, then come back and repair.',
      picks:[
        ['/parents.html','For parents','Siblings who fight, big feelings, coming back after you yell, teens and stepfamilies, with words you could use.'],
        ['/upset-right-now.html#parent-child','When it\u2019s you and your child','What to do in the minute you\u2019re about to yell, or just did.'],
        ['/workpapers/wp-13-daily-check-in.html','The 90-second daily check-in','A tiny daily habit that keeps the door open.']
      ]},
    { id:'teen', ico:'\uD83C\uDFA7', label:'I\u2019m a teen and home feels hard',
      say:'Fair enough. Growing up means you and the adults around you are both figuring out the new rules at the same time, and that gets loud. Here is stuff written for you, not about you.',
      picks:[
        ['/teens.html','For teens','Parents, friends, feelings and dating, with places to get help.'],
        ['/signal-translator.html','The Chat analyzer','Test a message before you send it.'],
        ['/frequency-journey.html','The arcade','When you just need a break.']
      ]},
    { id:'work', ico:'\uD83D\uDCBC', label:'At work, or in business together',
      say:'Work has its own version of all of this: who owns which job, messages that land badly, and effort nobody sees. Business partners have it too, plus money and big decisions. There is a plain, no-cartoons version you can use with your team or your partner in the business.',
      picks:[
        ['/work.html','At work: the plain version','One owner per job for a team, messages that land, appreciation that fits, and a 45-minute team session.'],
        ['/work.html#business-partners','Running a business together','Co-founders and co-owners: who owns what, money, and how to decide.'],
        ['/signal-translator.html?use=work','The message checker','Test an email or chat message before you send it.']
      ]},
    { id:'grief', ico:'\uD83D\uDD4A', label:'Just retired, a loss, or a big life change',
      say:'Retirement, a loss, a parent who needs more care, a quiet house: big changes rearrange who does what and how people talk. Go gently. None of this has to be fixed today.',
      picks:[
        ['/retired-together.html','Retired and both home now','Sharing the house all day, handing over whole jobs, and finding your feet after work.'],
        ['/grief.html','Grief and loss','Loss, family after a loss, reconnecting, and starting a new chapter, with places to get help.'],
        ['/relationships-in-depth.html#caregivers','Looking after someone','When caring for someone you love becomes most of the week.'],
        ['#breathe','Breathe for a minute','A short pause, right here.']
      ]},
    { id:'stepfamily', ico:'\uD83E\uDDE9', label:'We\u2019re a stepfamily or blended family',
      say:'Joining two families takes time, often years, and every person in it is adjusting: the parent in the middle, the stepparent finding a place, and children who may live in two homes. None of that means you chose wrong.',
      picks:[
        ['/parents.html#stepfamilies','Stepfamilies and blended families','Who leads on rules, loyalty binds, names, and the stepparent\u2019s own place.'],
        ['/co-parenting.html','Separated co-parents','Holiday schedules, handoffs, and messages to an ex that stay calm and factual.'],
        ['/lemonade-stand.html','The Lemonade Stand','Share the jobs fairly, with a smaller share for a child who lives here part of the time.']
      ]},
    { id:'family-duty', ico:'\uD83C\uDF0D', label:'Family back home, money and in-laws',
      say:'Supporting parents, sending money home, long visits from family: in many families these are duties, not habits. They go better when the two of you plan them together, so neither of you feels judged or shut out.',
      picks:[
        ['/family-obligations.html','Supporting family: parents, money home and duty','Agree a monthly amount, save alongside it, and each lead with your own family.'],
        ['/library/conflict.html#family-disagreements','Disagreeing about family and in-laws','Even-handed: loyalty to a parent is not disloyalty to a partner.'],
        ['/lemonade-stand.html#money','Put the money in the Lemonade Stand','Family support as an agreed amount, never a debt between you.']
      ]},
    { id:'apart', ico:'\u2708\uFE0F', label:'We live apart or far away',
      say:'Distance makes small things heavier: a short text reads colder than it was meant, and who calls whom can turn into a scorecard. A few agreements make it lighter.',
      picks:[
        ['/long-distance.html','Long-distance and apart','Call rhythm, time zones, video check-ins and reading short texts.'],
        ['/turning-toward.html','Turning toward','Small moments you can send to their phone in one tap.'],
        ['/signal-translator.html','The Chat analyzer','Check how a short text might land, before you guess.']
      ]},
    { id:'keep-good', ico:'\uD83C\uDF31', label:'We\u2019re okay, but it feels a bit flat',
      say:'Nothing is wrong, and that\u2019s worth protecting. When things feel flat, small regular moments of attention bring the warmth back, without turning it into a problem to solve.',
      picks:[
        ['/complacency.html','When \u201cfine\u201d stops being checked','The quiet signs, and the small re-checks that keep things alive.'],
        ['/turning-toward.html','Turning toward','Seven small, everyday ways to build connection while things are good.'],
        ['/workpapers/wp-13-daily-check-in.html','The 90-second daily check-in','The smallest habit here, and the one that lasts.'],
        ['/quick-checks.html#today','Today\u2019s Weather','A daily minute that keeps small things small.']
      ]},
    { id:'separated', ico:'\uD83D\uDD00', label:'We\u2019re separated and share the kids',
      say:'Two homes can work well for kids when the grown-up messages stay short, factual and about the children. You can only control your side, and that is often enough.',
      picks:[
        ['/co-parenting.html','Separated co-parents','Calmer handoffs, short messages, and what to do when the other parent won\u2019t cooperate.'],
        ['/signal-translator.html','Check a message first','See how a message may land before you send it.'],
        ['/on-my-own.html#part-time-parent','Part-time with your kids','Weekend ideas, the Sunday goodbye, and staying close in between.']
      ]},
    { id:'unsure', ico:'\uD83E\uDD14', label:'I am not sure this is for me',
      say:'Fair. It fits some situations and not others, and it is better to find that out now than after three worksheets. Nothing here costs anything, and there is no paid version.',
      picks:[
        ['/is-this-for-you.html','Is this right for you?','What it is, what it is not, and who it does not suit.'],
        ['/how-it-works.html','How it works','The whole idea in plain language, in about four minutes.'],
        ['/ways-in.html','Ways in','What is free, what an email opens, and what each level shares.']
      ]},
    { id:'group', ico:'\uD83D\uDC65', label:'I want to use this with a group',
      say:'A church small group, a couples\u2019 class or a community circle can use the free pages together, with no sign-up for anyone.',
      picks:[
        ['/groups.html','Leading a group','Six sessions with discussion questions and one-page handouts.'],
        ['/check-ins.html','Check-ins','A good first session: hear it back before you answer.']
      ]}
  ];

  function el(t, a, h) {
    var n = document.createElement(t);
    if (a) for (var k in a) { if (a[k] !== null) n.setAttribute(k, a[k]); }
    if (h) n.innerHTML = h;
    return n;
  }
  function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  // data-first="id,…" picks the few shown first; data-first-me="id,…" is used instead after "Just me" (tol-mode-v1)
  function modeNow() { try { return localStorage.getItem('tol-mode-v1') || ''; } catch (e) { return ''; } }

  document.querySelectorAll('[data-tol-start]').forEach(function (host) {
    var compact = host.hasAttribute('data-compact');
    var wrap = el('div', { class: 'sw' + (compact ? ' is-compact' : '') });
    var opts = el('div', { class: 'sw-opts', role: 'group', 'aria-label': 'What is going on right now' });
    var out = el('div', { class: 'sw-out', 'aria-live': 'polite', tabindex: '-1', hidden: '' });
    out.style.scrollMarginTop = '5rem';
    out.style.outline = 'none';
    out.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[data-breathe]');
      var btn = document.querySelector('.tol-breathe-btn');
      if (a && btn) { e.preventDefault(); btn.click(); }
    });
    var buttons = {}, more = null;
    S.forEach(function (s) {
      var b = el('button', { type: 'button', class: 'sw-opt', 'aria-pressed': 'false', 'data-id': s.id },
        '<span class="sw-ico" aria-hidden="true">' + s.ico + '</span><span class="sw-label">' + esc(s.label) + '</span>');
      b.addEventListener('click', function () { choose(s, b); });
      buttons[s.id] = b;
    });
    wrap.appendChild(opts);
    wrap.appendChild(out);
    host.appendChild(wrap);

    // order the tiles: the chosen few first, the rest one tap away behind "See all"
    function order(keepOpen) {
      var attr = (modeNow() === 'me' && host.getAttribute('data-first-me')) || host.getAttribute('data-first') || '';
      var first = attr.split(',').filter(Boolean), list = S.slice();
      if (first.length) {
        list = first.map(function (id) { return S.filter(function (s) { return s.id === id; })[0]; }).filter(Boolean);
        S.forEach(function (s) { if (list.indexOf(s) === -1) list.push(s); });
      }
      // Focus mode (site.js TOLFocus): situations that fit the chosen areas come first; the rest stay one tap away
      try {
        var F = window.TOLFocus;
        if (F && F.isOn && F.isOn() && F.allows) {
          var fit = list.filter(function (s) { return (s.picks || []).some(function (p) { return p[0] && p[0].charAt(0) === '/' && F.allows(p[0]); }); });
          if (fit.length) { list = fit.concat(list.filter(function (s) { return fit.indexOf(s) === -1; })); first = fit.slice(0, 9).map(function (s) { return s.id; }); }
        }
      } catch (e) {}
      var extra = [];
      list.forEach(function (s, i) {
        var b = buttons[s.id];
        b.hidden = !keepOpen && first.length > 0 && i >= first.length;
        if (b.hidden) extra.push(b);
        opts.appendChild(b);
      });
      if (more) { more.remove(); more = null; }
      if (extra.length) {
        // "(31 more)", so the count never reads as the total
        more = el('button', { type: 'button', class: 'sw-showmore', 'aria-expanded': 'false' }, esc(host.getAttribute('data-more') || 'See more situations') + ' (' + extra.length + ' more)');
        more.addEventListener('click', function () {
          extra.forEach(function (b) { b.hidden = false; });
          var f = extra[0]; more.remove(); more = null; host.setAttribute('data-sw-all', ''); f.focus();
        });
        opts.after(more);
      }
    }
    order(false);
    document.addEventListener('tol-mode', function () { order(host.hasAttribute('data-sw-all')); });

    function choose(s, btn, quiet) {
      var was = btn.getAttribute('aria-pressed') === 'true';
      opts.querySelectorAll('.sw-opt').forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
      if (was && !quiet) { out.hidden = true; out.innerHTML = ''; return; }
      btn.setAttribute('aria-pressed', 'true');
      var h = (s.lead ? '<p class="sw-lead"><a href="' + s.lead[0] + '">' + esc(s.lead[1]) + '</a></p>' : '') + '<p class="sw-say">' + esc(s.say) + '</p><ol class="sw-picks">';
      s.picks.forEach(function (p) {
        // '#breathe' opens the site's Breathe break (the Night Garden if that button is missing)
        var link = p[0] === '#breathe' ? 'href="/night-garden.html" data-breathe="1"' : 'href="' + p[0] + '"';
        h += '<li><a ' + link + '>' + esc(p[1]) + '</a><span>' + esc(p[2]) + '</span></li>';
      });
      h += '</ol><p class="sw-more">Something else going on? <a href="/contents.html">See everything in the program</a> or <a href="/relationships.html">pick by relationship</a>.</p>';
      out.innerHTML = h;
      out.hidden = false;
      // bring the answer into view and move focus to it, so it never opens off-screen
      var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      try { out.focus({ preventScroll: true }); } catch (e) { out.focus(); }
      out.scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' });
    }
    // a link elsewhere on the page with data-sw-open="id" opens that situation here (it stays a normal link without this script)
    host.tolOpen = function (id) {
      var s = S.filter(function (x) { return x.id === id; })[0], b = buttons[id];
      if (!s || !b) return false;
      if (b.hidden) b.hidden = false;
      choose(s, b, true);
      return true;
    };
  });
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('[data-sw-open]');
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
    var host = document.querySelector('[data-tol-start]');
    if (host && host.tolOpen && host.tolOpen(a.getAttribute('data-sw-open'))) e.preventDefault();
  });
})();
