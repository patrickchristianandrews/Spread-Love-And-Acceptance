/* test-messages.js — a broad quality pass for the Signal Translator: realistic messages across
   partners, family, friends, roommates, coworkers and co-parents (kind, neutral, passive-aggressive,
   sarcastic, hostile, profane, typo'd, emoji, very short, long), each with the verdict band it should get.

     node tools/signal/test-messages.js        # summary and failures
     node tools/signal/test-messages.js -v     # every message, its verdict and the best rewrite

   Bands (general reading, by text): C clear, S some static, H heavy static. "CS" means either.
   Every hostile, profane or name-calling line must be heavy, and its rewrite must drop the swearing,
   the fed-up line and the insult, and say the feeling plus an ask. Nothing flagged may read "Clear". */
'use strict';
const path = require('path');
const E = require(path.join(__dirname, '../../assets/js/signal-engine.js'));
const P = require(path.join(__dirname, '../../assets/js/message-patterns.js'));

const M = [
  // ---------------- kind and clear
  ['partner', 'Thank you for making dinner tonight, it was lovely.', 'C'],
  ['partner', 'I love you. Drive safe!', 'C'],
  ['partner', 'Could you pick up milk on your way home? Thanks!', 'C'],
  ['partner', 'I felt a bit lonely tonight. Could we have a phone-free half hour after dinner?', 'C'],
  ['partner', 'I had a rough day. Can I tell you about it after the kids are in bed?', 'C'],
  ['family', 'Happy birthday, Mom! Can’t wait to see you Sunday.', 'C'],
  ['family', 'Thanks for having us this weekend. The kids loved it.', 'C'],
  ['friend', 'Want to grab coffee on Saturday morning?', 'C'],
  ['friend', 'I’m so proud of you for finishing the race!', 'C'],
  ['friend', 'No worries at all, we can reschedule. Does Thursday work?', 'C'],
  ['roommate', 'Hey, could you take the recycling out by Tuesday night? Thanks!', 'C'],
  ['roommate', 'I’m having a friend over Friday evening, is that okay with you?', 'C'],
  ['coworker', 'Thanks for the quick turnaround on the deck.', 'C'],
  ['coworker', 'Could you send me the Q3 numbers by 3 today? I need them for the 4pm review.', 'C'],
  ['coworker', 'Great work on the launch, team. I really appreciate the late nights.', 'C'],
  ['coparent', 'Pickup is at 5 on Friday. Sam has soccer at 10 on Saturday.', 'CS'],
  ['coparent', 'Thanks for switching weekends. It really helped.', 'C'],
  ['partner', 'I’m sorry I snapped earlier. That wasn’t fair to you.', 'C'],
  ['partner', 'I can’t talk about this right now. Can we talk at 8?', 'C'],
  ['friend', 'Congrats on the new job!! 🎉', 'C'],
  // ---------------- neutral, with a small gap (no time, vague, a hedge)
  ['partner', 'Can you do the dishes?', 'CS'],
  ['roommate', 'Could you clean the bathroom sometime?', 'S'],
  ['roommate', 'can you clean up a bit when you get a chance', 'S'],
  ['coworker', 'Any update?', 'S'],
  ['coworker', 'Just checking in on this.', 'S'],
  ['coworker', 'Per my last email, the deadline is Friday.', 'S'],
  ['coworker', 'Friendly reminder to submit your timesheets.', 'S'],
  ['family', 'Call me when you can.', 'CS'],
  ['partner', 'We need to talk.', 'S'],
  ['partner', 'Can we talk?', 'S'],
  ['friend', 'I guess.', 'CS'],
  ['partner', 'k', 'S'],
  ['partner', 'Fine.', 'SH'],
  ['partner', 'ok.', 'S'],
  ['partner', 'Whatever.', 'SH'],
  ['partner', 'Sure.', 'S'],
  ['coworker', 'Noted.', 'S'],
  ['partner', '…', 'SH'],
  ['partner', 'We’ll see.', 'CS'],
  ['friend', 'Maybe.', 'CS'],
  // ---------------- orders, shoulds, blame questions
  ['partner', 'You need to clean your room.', 'S'],
  ['partner', 'You should apologize to her.', 'S'],
  ['partner', 'You should have told me.', 'S'],
  ['partner', 'Take out the trash.', 'CS'],
  ['partner', 'Why don’t you ever help?', 'SH'],
  ['partner', 'Why didn’t you tell me?', 'S'],
  ['partner', 'How many times do I have to tell you to lock the door?', 'SH'],
  ['partner', 'Can you not leave dishes in the sink?', 'S'],
  ['roommate', 'Why is the kitchen still a mess?', 'SH'],
  ['coworker', 'I need this done now.', 'S'],
  ['coworker', 'Send it ASAP!!!', 'SH'],
  ['family', 'If you don’t come for Thanksgiving, don’t bother coming at Christmas.', 'H'],
  ['partner', 'If you don’t clean up, I’m leaving.', 'H'],
  // ---------------- always / never, the past, again
  ['partner', 'You always forget.', 'S'],
  ['partner', 'You never listen to me.', 'SH'],
  ['partner', 'You’re late again.', 'S'],
  ['partner', 'Last time you did this too.', 'S'],
  ['roommate', 'You never do the dishes.', 'SH'],
  ['partner', 'You still haven’t fixed the door.', 'S'],
  ['family', 'Your sister always calls on Sundays.', 'SH'],
  ['partner', 'Why can’t you be more like your brother?', 'SH'],
  ['partner', 'After everything I do for you, you can’t even do this.', 'SH'],
  ['partner', 'I have to do everything around here.', 'SH'],
  // ---------------- passive-aggressive and hints
  ['roommate', 'SOME of us like having clean dishes 🙂', 'SH'],
  ['roommate', 'It would be nice if someone helped around here.', 'SH'],
  ['roommate', 'I guess I’ll take the trash out again since nobody else will.', 'SH'],
  ['family', 'Don’t worry about me.', 'SH'],
  ['coworker', 'No need to be rude.', 'SH'],
  ['friend', 'Not that anyone asked.', 'SH'],
  ['partner', 'Thanks for finally noticing.', 'SH'],
  ['partner', 'Must be nice to sit around all day.', 'SH'],
  ['roommate', 'Someone should really clean the fridge.', 'SH'],
  ['coworker', 'Going forward, please cc me.', 'CS'],
  // ---------------- sarcasm
  ['partner', 'Wow, thanks for nothing.', 'SH'],
  ['partner', 'Oh great, another late night.', 'SH'],
  ['partner', 'Nice of you to finally show up.', 'SH'],
  ['partner', 'Of course you did. I have to do everything around here.', 'SH'],
  ['friend', 'Yeah right.', 'SH'],
  ['partner', 'lol ok whatever you say 🙄', 'H'],
  ['coworker', 'Great job, genius.', 'SH'],
  ['family', 'Must be nice.', 'SH'],
  // ---------------- dismissing and invalidating
  ['partner', 'Calm down.', 'SH'],
  ['partner', 'You’re overreacting.', 'SH'],
  ['partner', 'It was just a joke, can’t you take a joke?', 'SH'],
  ['partner', 'You’re too sensitive.', 'SH'],
  ['partner', 'Not a big deal.', 'S'],
  ['family', 'Get over it.', 'SH'],
  // ---------------- contempt and name-calling (always heavy)
  ['partner', 'You are a total nightmare.', 'H'],
  ['partner', 'You’re so lazy.', 'H'],
  ['partner', 'You’re being selfish.', 'H'],
  ['roommate', 'I’m the only adult here, clean the kitchen.', 'H'],
  ['partner', 'You idiot.', 'H'],
  ['partner', 'Grow up.', 'H'],
  ['partner', 'Are you serious right now 🙄', 'H'],
  ['coparent', 'You’re a terrible parent.', 'H'],
  ['coworker', 'You’re completely useless.', 'H'],
  ['family', 'You’re such a disappointment.', 'H'],
  ['partner', 'You’re pathetic.', 'H'],
  ['roommate', 'You’re a slob.', 'H'],
  // ---------------- hostile and fed up (always heavy)
  ['partner', 'You are getting on my last nerve', 'H'],
  ['partner', 'Shut up.', 'H'],
  ['partner', 'I’m so done with you.', 'H'],
  ['partner', 'You’re driving me crazy.', 'H'],
  ['partner', 'I can’t stand you.', 'H'],
  ['partner', 'I hate you.', 'H'],
  ['family', 'Leave me alone.', 'SH'],
  ['partner', 'Go away.', 'H'],
  ['partner', 'I’m sick and tired of this.', 'H'],
  ['partner', 'What is wrong with you?', 'H'],
  ['friend', 'Who cares.', 'H'],
  ['partner', 'Do whatever you want.', 'H'],
  ['roommate', 'Get out of my face.', 'H'],
  ['partner', 'I’ve had it with you.', 'H'],
  ['coworker', 'Mind your own business.', 'H'],
  // ---------------- swearing, any intensity or disguise (always heavy)
  ['partner', 'You are getting on my last fucking nerve', 'H'],
  ['partner', 'You are getting on my last f*cking nerve', 'H'],
  ['partner', 'wtf is wrong with you', 'H'],
  ['partner', 'Can you fucking clean the kitchen tonight?', 'H'],
  ['roommate', 'clean your shit up', 'H'],
  ['partner', 'Fuck this. I’m done.', 'H'],
  ['partner', 'shut the fuck up', 'H'],
  ['friend', 'fkn hell, again??', 'H'],
  ['partner', 'fuckin unbelievable', 'H'],
  ['coworker', 'This is bullshit.', 'H'],
  ['partner', 'Damn it, you forgot again.', 'H'],
  ['partner', 'Are you f***ing kidding me?', 'H'],
  ['roommate', 'What the hell happened to the kitchen?', 'H'],
  ['partner', 'You’re a fucking idiot.', 'H'],
  ['partner', 'screw you', 'H'],
  ['partner', 'Piss off.', 'H'],
  ['coworker', 'ffs, just send it', 'H'],
  ['partner', 'This is crap and you know it.', 'H'],
  // ---------------- all caps and stacked punctuation
  ['partner', 'WHY IS THE KITCHEN STILL A MESS', 'H'],
  ['partner', 'ANSWER YOUR PHONE', 'SH'],
  ['partner', 'Where are you??', 'S'],
  ['roommate', 'WHO ATE MY LEFTOVERS?!', 'SH'],
  // ---------------- typos read as the word meant
  ['partner', 'you’re allways late', 'S'],
  ['roommate', 'can you clen up a bit wen you get a chance', 'S'],
  ['partner', 'you nevr lisen to me', 'SH'],
  ['partner', 'im sory i was late, can we tlk tonite?', 'CS'],
  ['partner', 'u r so lazy', 'H'],
  // ---------------- emoji
  ['partner', 'Love you ❤️', 'C'],
  ['partner', 'ok 🙄', 'H'],
  ['friend', 'haha sure 😂', 'CS'],
  ['partner', 'Thanks for the flowers 🥰', 'C'],
  // ---------------- blame with no ask
  ['partner', 'This is all your fault.', 'SH'],
  ['partner', 'You ruined everything.', 'SH'],
  ['partner', 'You made me feel stupid.', 'SH'],
  ['partner', 'You know what you did.', 'SH'],
  // ---------------- long
  ['partner', 'I know you’ve been working a lot and I really appreciate it, but I’ve been doing every school run and every dinner for three weeks and I’m exhausted, and I feel like I’m running the house by myself, and I don’t know how much longer I can keep this up without some help.', 'SH'],
  ['coworker', 'Hi all, a quick recap from today: the launch moves to Thursday, Priya owns the QA checklist, Marco is updating the release notes, and I will send the customer email by Wednesday at noon. Shout if I missed anything.', 'CS'],
  ['coparent', 'The kids need to be picked up at 3 not 4 and you need to bring the soccer bag and the permission slip and remember that Mia has the dentist on Monday.', 'SH'],
  // ---------------- work, for slow readers and clear asks
  ['coworker', 'Could you review the draft by Thursday at 2? One ask: check the numbers on page 3.', 'C'],
  ['coworker', 'Quick one: can you join the 10am call tomorrow?', 'C'],
  ['coworker', 'Circling back on this.', 'S'],
  ['coworker', 'As previously stated, the budget is final.', 'S'],
  ['coworker', 'Please advise.', 'S'],
  // ---------------- re-test: an apology with blame after it, parenting, everyday examples from anywhere
  ['partner', 'Oh no, sorry!! I was totally distracted, I’m the worst 😩 but you didn’t have to say it like that', 'SH'],
  ['partner', 'You always correct me with the baby.', 'S'],
  ['coparent', 'If you’re late again I’ll take you to court and you’ll never see the kids.', 'H'],
  ['family', 'Could we split the bill evenly this time?', 'CS'],
  ['family', 'Please call your parents back today. They asked twice.', 'CS'],
  ['roommate', 'Can you send your share of the rent by the 1st?', 'CS'],
  ['family', 'Thank you for helping my mother with her forms.', 'C'],
  // ---------------- testers, round 4: team leads, excuses, a carer's group message, a reply with a proposal
  ['manager', 'Guys, this is the third time the handover was missed. Sort it out.', 'SH'],
  ['coworker', 'This is the second time the report was late.', 'S'],
  ['manager', 'Folks, timesheets were missed again!', 'S'],
  ['partner', 'Sorry, I forgot again. You know how I am.', 'S'],
  ['friend', 'Sorry I was late, that’s just how I am.', 'S'],
  ['roommate', 'I can’t help it, I’m wired that way.', 'S'],
  ['family', 'I’m done doing everything for Dad while you two do nothing.', 'SH'],
  ['family', 'It’s always me who calls Mum.', 'S'],
  ['partner', 'ok. i said maybe because of work, not because of you. call sunday?', 'C'],
];

const SWEAR = /\b(?:f+u+c+k\w*|f\*+\w*|fk\w*|fuk\w*|sh[i*]t\w*|bullsh\w*|damn\w*|hell|crap\w*|piss\w*|wtf|ffs|screw you|idiot|nightmare|lazy|selfish|useless|pathetic|slob|disappointment|terrible parent|last nerve|shut up|driving me crazy|can't stand|hate you|done with you)\b/i;
const HOT = ['swear', 'hostile', 'label', 'contempt', 'threat'];

let pass = 0, fail = 0; const errs = [];
const verbose = process.argv.includes('-v');
M.forEach(([rel, t, want]) => {
  const ch = rel === 'coworker' ? 'chat' : 'text';
  const an = E.analyze(t, { channel: ch });
  const sc = E.score(an, ['general'], ch);
  const band = { clear: 'C', some: 'S', heavy: 'H' }[sc.level[0]];
  const rw = E.rewrite(an, { wirings: ['general'], channel: ch, rel });
  const why = [];
  if (want.indexOf(band) === -1) why.push('verdict ' + sc.level[1] + ' (want ' + want + ')');
  const hot = an.staticIds.some(id => HOT.includes(id));
  if (hot && band !== 'H') why.push('a hot pattern but not heavy');
  if (want === 'H' && !hot && band === 'H' && !/[A-Z]{4}/.test(t)) {/* heavy for another reason: fine */}
  if (an.staticIds.length && sc.level[1] === 'Clear signal') why.push('flagged but "Clear signal"');
  // every rewrite drops the swearing, the fed-up line and the name-calling
  const texts = [rw.main].concat((rw.variants || []).map(v => v.text));
  if (hot) texts.forEach(x => { const m = x.replace(/[’]/g, "'").match(SWEAR); if (m) why.push('rewrite keeps “' + m[0] + '”: ' + x); });
  // a hostile line becomes feeling + ask
  if (an.found.hostile || an.found.swear && !an.asks.length) {
    if (!/frustrated|upset|hurt|a break|a few minutes/i.test(rw.main)) why.push('hostile rewrite names no feeling: ' + rw.main);
    if (!/\?/.test(rw.main)) why.push('hostile rewrite has no ask: ' + rw.main);
  }
  if (rw.unchanged && hot) why.push('no rewrite for a hot line');
  // contradictions: a rewrite that repeats the flagged absolute, or "Your words" for a heavy line
  if (band === 'H' && rw.primary && rw.primary.label === 'Your words') why.push('heavy line, but "Your words" offered');
  if (/\?\?|\.\?|\?\./.test(rw.main)) why.push('broken punctuation: ' + rw.main);
  if (/\b(?:A|The|Could) [A-Z]{2,}/.test(rw.main)) why.push('stray capitals: ' + rw.main);
  if (why.length) { fail++; errs.push('[' + rel + '] ' + t + '\n    ' + why.join('\n    ') + '\n    → ' + rw.main); } else pass++;
  if (verbose) console.log((why.length ? 'FAIL ' : 'ok   ') + band + ' ' + t + '\n       → ' + rw.main);
});
// first-time testers: explanations match the matched word; typos read as the word meant; literal listeners
const chk = (c, m) => { if (c) pass++; else { fail++; errs.push(m); } };
{
  const an = E.analyze('I literally just got home.', { channel: 'text' });
  const r = E.readings(an, ['adhd', 'autistic'], 'text');
  chk(!an.found.minim && an.found.intens, '"literally" is an intensifier, not a "just" minimizer');
  chk(!JSON.stringify(r).includes('Just'), '"literally" never gets the "just" explanation');
  const fine = E.readings(E.analyze('Fine.', { channel: 'text' }), ['autistic'], 'text').autistic;
  chk(!fine.some(e => /curt|face value, so say/.test(e.h + e.y)), 'autistic "Fine." has no neurotypical "curt" reading with a mismatched reason');
  const a1 = E.analyze('you’re allways late', { channel: 'text' });
  chk(a1.found.absolute && a1.readAs.some(f => f.to === 'always'), '"allways" reads as "always", and says so');
  const a2 = E.rewrite(E.analyze('can you clen up a bit wen you get a chance', { channel: 'text' }), { wirings: [] });
  chk(!a2.unchanged && /clean/.test(a2.main) && /\[a time\]/.test(a2.main), 'typo’d ask still gets a rewrite: ' + a2.main);
  const lit = E.rewrite(E.analyze('I have nothing left in the tank and I cannot even deal with this tonight.', { channel: 'text' }), { wirings: ['autistic'] });
  chk(/no energy left/.test(lit.main) && !/tank|even/.test(lit.main), 'idioms and hyperbole get plain words: ' + lit.main);
  const nm = E.rewrite(E.analyze('You are a total nightmare. The kitchen is a mess.', { channel: 'text' }), { wirings: [] });
  chk(!/nightmare/.test(nm.main) && /kitchen/.test(nm.main), 'the insult goes, the point stays: ' + nm.main);
}
// ---------------- second round of testers (ADHD, autistic, dyslexic, highly sensitive)
{
  const rw = (t, w) => E.rewrite(E.analyze(t, { channel: 'text' }), { wirings: w || ['general'], channel: 'text' });
  const band = t => E.score(E.analyze(t, { channel: 'text' }), ['general'], 'text').level[0];
  const BOLT = /Could you \[one specific thing\] by \[a time\]\?/;
  const BROKEN = /\.,|,\s*,|\.\.(?!\.)|, and [A-Z]|\b(?:and|but) Could\b|\w Could you/;
  const all = r => [r.main].concat((r.variants || []).map(v => v.text));
  // a rewrite is never worse than the original
  [
    ['Oh great, you forgot AGAIN. Wow. Amazing.', /Wow|Amazing|great/i],
    ['Sure, whatever you say, genius.', /genius|whatever you say/i],
    ['Sorry sorry sorry I’m so stupid, I forgot again', /stupid|sorry sorry/i],
    ['I’m going to kill you if you’re late again.', /kill/i],
    ['You’re pathetic. You never do anything right and I’m sick of you.', /pathetic|anything right|sick of/i],
    ['Can you read the room?', /read the room|by \[a time\]/i],
    ['Break a leg tonight!', /leg/i],
    ['You are so autistic.', /autistic/i],
    ['Nobody asked you.', /nobody asked/i],
    ['don’t "ok" me. this is why nobody wants to deal with you', /nobody wants|ok me/i]
  ].forEach(([t, bad]) => all(rw(t)).forEach(x => chk(!bad.test(x), 'rewrite keeps what it flagged (“' + t + '”): ' + x)));
  // no demand bolted onto apologies, sarcasm, figures of speech, questions or lines with no request
  ['Sorry sorry sorry I’m so stupid, I forgot again', 'I’m so sorry I missed your call.', 'Sure, whatever.', 'Sure, whatever you say, genius.', 'Can you read the room?', 'Break a leg tonight!', 'Why are you like this', 'Nobody asked you.', 'I’m going to kill you if you’re late again.', 'Great job, genius.', 'Yeah right.', 'fine.', 'i don’t care']
    .forEach(t => chk(!BOLT.test(rw(t).main), 'no bolted-on “Could you [one thing] by [a time]?” for “' + t + '”: ' + rw(t).main));
  // grammar joins
  ['Hey, no rush, could we talk about the bills sometime this week? I love you.', 'I love you but I need you to stop interrupting me', 'No rush, but could you call the landlord sometime?', 'fine.', 'Oh great, you forgot AGAIN. Wow. Amazing.', 'Sorry sorry sorry I’m so stupid, I forgot again', 'We should get coffee sometime.']
    .forEach(t => all(rw(t)).forEach(x => chk(!BROKEN.test(x) && !/No rush before then\.,/.test(x), 'broken join in “' + t + '”: ' + x)));
  chk(rw('I love you but I need you to stop interrupting me').main === 'I love you. Could you stop interrupting me?', 'love + ask reads cleanly: ' + rw('I love you but I need you to stop interrupting me').main);
  chk(!/by \[a time\]/.test(rw('We should get coffee sometime.').main), 'an invitation gets a day, not a deadline: ' + rw('We should get coffee sometime.').main);
  // no feeling the page promises not to add
  ['Sure, whatever.', 'Fine.', 'fine. whatever you want', 'whatever', 'Great job, genius.', 'You are so autistic.']
    .forEach(t => chk(!/^(?:That's frustrating for me|I'm okay with that|I'm frustrated)/.test(rw(t).main), 'adds a feeling to “' + t + '”: ' + rw(t).main));
  // typos: the rewrite uses the corrected word, and the verdict doesn't move
  chk(!/tlak/.test(rw('we need to tlak later').main) && band('we need to tlak later') === band('we need to talk later'), 'typo “tlak” is read and rewritten as “talk”: ' + rw('we need to tlak later').main);
  chk(/^It's hard for me when you do this/.test(rw('wy do you allways do this').main), 'typo’d “wy do you allways” reads as “why do you always”: ' + rw('wy do you allways do this').main);
  chk(/phone/.test(rw('your always on your fone').main) && !/Your often|fone/.test(rw('your always on your fone').main), '“your always on your fone” reads as “you’re always on your phone”: ' + rw('your always on your fone').main);
  [['whatevr', 'whatever'], ['fine whatevs', 'fine, whatever'], ['wy are you like this', 'why are you like this']].forEach(([a, b]) => chk(band(a) === band(b), 'spelling changes the verdict: ' + a));
  // brush-offs and put-downs are static, the same as in the Conversation Reader
  ['fine. whatever you want', 'i don’t care', 'whatevs', 'fine whatevs', 'Sure, whatever.', 'whatevr'].forEach(t => chk(band(t) !== 'clear', 'brush-off “' + t + '” reads as clear'));
  ['Nobody asked you.', 'You are so autistic.', 'this is why nobody wants to deal with you', 'I’m going to kill you if you’re late again.'].forEach(t => chk(band(t) === 'heavy', '“' + t + '” should be heavy static, got ' + band(t)));
  chk(E.analyze('You are so autistic.').found.dxlabel, 'a diagnosis used as an insult has its own reading');
  chk(E.analyze('Can you stop stimming in public?').found.tic && /Stimming helps/.test(rw('Can you stop stimming in public?').main), 'asking someone to stop stimming gets a note');
  chk(!E.analyze('Could you maybe possibly think about perhaps doing the dishes at some point if that is okay?').found.softno && /^Could you do the dishes/.test(rw('Could you maybe possibly think about perhaps doing the dishes at some point if that is okay?').main), 'stacked hedges are one problem, and they go');
  // figures of speech: the meaning is given, and the sections agree
  const leg = rw('Break a leg tonight!');
  chk(/good luck/i.test(leg.main) && !leg.unchanged, '“Break a leg” is explained and rewritten: ' + leg.main);
  chk(P.idioms('maybe read the room lol')[0].means.indexOf('notice') === 0, '“read the room” has a plain meaning');
  chk(P.idioms('It’s not rocket science.').length === 1, '“not rocket science” has a plain meaning');
  chk(E.analyze('Why are you like this').found.blameq && !E.analyze('Why are you like this').found.feelingq, '“Why are you like this” is a complaint, not an open feelings question');
  // "I'm sick of you" is never a feeling worth keeping
  chk(!E.analyze('You’re pathetic. You never do anything right and I’m sick of you.').goodIds.includes('feeling'), '“I’m sick of you” marked as a named feeling worth keeping');
  // someone sent me this: kind, no mind-reading, a limit when a line was crossed
  const got = E.receive(E.analyze('You’re pathetic. You never do anything right and I’m sick of you.', { channel: 'text' }));
  const gotText = JSON.stringify(got);
  chk(got.crossed && got.replies.some(r => /not okay being spoken to/.test(r.text)), 'received put-down: a calm limit is offered');
  chk(!/think I'm|can't stand me|Nothing I do|bad person|pathetic|sick of you/i.test(gotText), 'received put-down: no insults read back, no mind-reading: ' + gotText);
  const got2 = E.receive(E.analyze('fine. whatever', { channel: 'text' }));
  chk(!got2.crossed && got2.meanings.some(m => /can't tell you which/.test(m)) && got2.replies.length, 'received brush-off: both readings, and a question to ask');
  const got3 = E.receive(E.analyze('Can you read the room?', { channel: 'text' }));
  chk(got3.literal.length && got3.replies.some(r => /did you mean notice/.test(r.text)) && !got3.replies.some(r => /By when/.test(r.text)), 'received figure of speech: meaning and a check, no deadline');
  chk(E.receive(E.analyze('Thanks for dinner!')).meanings.length && !E.receive(E.analyze('Thanks for dinner!')).crossed, 'a kind message reads as kind');
}
// ---------- couple usability round: brush-offs, sarcasm, grammar, safety, deadlines, co-parent threats ----------
{
  const an = t => E.analyze(t, { channel: 'text' });
  const rw = (t, rel) => E.rewrite(an(t), { wirings: ['general'], channel: 'text', rel: rel || 'partner' });
  const sc = t => E.score(an(t), ['general'], 'text').score;
  const all = r => [r.main].concat((r.variants || []).map(v => v.text));
  const BOLT = /\[one specific thing\] by \[a time\]|by \[a time\]\?/;
  // 1. curt pieces in a row are a brush-off in both modes, never "plain", and never quieter than "Fine." alone
  ['Fine. Whatever works for you.', 'Whatever works for you.', 'Fine. Whatever.', 'Sure. Do what you want.', 'Whatever you think is best.', 'k.'].forEach(t => {
    const a = an(t), g = E.receive(a);
    chk(a.found.brushoff || a.found.minimal, '“' + t + '” is flagged as a possible brush-off');
    chk(!g.meanings.some(m => /plain message/.test(m)) && g.replies.some(r => /really okay, or are you upset/.test(r.text)), '“' + t + '” received: a calm check question, not “plain message”');
    chk(!a.asks.length && !a.found.impera, '“' + t + '” is not an order or an ask');
  });
  chk(sc('Fine. Whatever works for you.') >= sc('Fine.'), '“Fine. Whatever works for you.” is at least as loud as “Fine.”');
  chk(/\[If it's really okay:\]/.test(rw('Fine. Whatever works for you.').main), 'the brush-off rewrite gives both halves: ' + rw('Fine. Whatever works for you.').main);
  chk(!an('Whatever works for you is fine, I’m free all weekend!').staticIds.length, 'a real “whatever works for you is fine” is not flagged');
  // 2. sarcasm and guilt: hurt underneath, not a request, and never a deadline
  ['Sure, go out with your friends, I’ll just sit here.', 'Don’t mind me.', 'I’ll just sit here.'].forEach(t => {
    const r = rw(t), g = E.receive(an(t));
    chk(!an(t).asks.length && !an(t).found.impera, '“' + t + '” is not read as an order');
    chk(all(r).every(x => !BOLT.test(x) && !/could you go out/i.test(x)), '“' + t + '” never gets “[thing] by [a time]”: ' + r.main);
    chk(/left out/.test(r.main), '“' + t + '” says the hurt plainly: ' + r.main);
    chk(!g.replies.some(x => /you'd like me to/.test(x.text)), '“' + t + '” received: no “you’d like me to go out…” check');
  });
  ['Sure, go ahead and take the car.', 'Go ahead and start without me, I’m running late.', 'I’ll just sit here and read until you’re ready.', 'Don’t mind me, just grabbing my keys.'].forEach(t => chk(!an(t).staticIds.length, 'ordinary “' + t + '” stays clear: ' + an(t).staticIds));
  // 3 and 7. "always" rewrites are grammatical, or a plain blank; never a fragment before "a lot"
  const baby = rw('You’re always correcting me with the baby, it is not respectful to me as her mother.').main;
  chk(/correcting me with the baby a lot\. It doesn't feel respectful/.test(baby) && !/mother a lot/.test(baby), '“always” rewrite is clean English: ' + baby);
  ['You always leave the lights on, it drives me crazy.', 'You’re always on your phone.', 'You never help with the kids and I’m exhausted.', 'You still haven’t paid the rent and it’s due Friday.', 'You’re always so thoughtful.'].forEach(t => all(rw(t)).forEach(x => chk(!/, it (?:is|was)[^.]*a lot|\bso \w+ a lot\b|you \w+ and it's due/i.test(x), 'broken English from “' + t + '”: ' + x)));
  chk(!an('You’re always so thoughtful.').found.absolute, '“always so thoughtful” is praise, not an absolute');
  // 4. safety: valid, the fact kept, a habit not a deadline
  [['You left the stove on again. That’s dangerous.', /stove gets turned off every time/], ['You left the front door unlocked again.', /door gets locked every time/], ['You didn’t buckle her into the car seat.', /buckled and checked every time/], ['You left the medicine on the counter where she can reach it.', /put away up high every time/]].forEach(([t, habit]) => {
    const a = an(t), r = rw(t), g = E.receive(a);
    chk(a.found.safety && !a.found.again, '“' + t + '”: a safety concern, and “again” is part of the fact');
    chk(habit.test(r.main) && !/\[a time\]/.test(r.main) && /safety worry|dangerous/.test(r.main), '“' + t + '”: habit ask, no deadline: ' + r.main);
    chk(/real safety worry/.test(g.meanings.join(' ')) && g.replies.some(x => /every time/.test(x.text)), '“' + t + '” received: valid worry, habit reply');
  });
  chk(/left the stove on again/.test(rw('You left the stove on again. That’s dangerous.').main), 'the fact (again) is kept for a safety worry');
  chk(!an('I left the door open for the dog.').found.safety, 'the speaker’s own choice is not a safety complaint');
  // 5. a time already in the draft is respected
  ['You forgot the dentist appointment on Friday.', 'Clean your room by 6pm.', 'You need to send the form by 6pm.', 'You still haven’t paid the rent and it’s due Friday.'].forEach(t => chk(!/\[a time\]/.test(rw(t).main), '“' + t + '” keeps its own time: ' + rw(t).main));
  // 6. court, custody and the children told first: heavy, and never kept in the rewrite
  ['If you keep this up I’ll take you to court.', 'My lawyer will be in touch.', 'You’ll never see them again.', 'I’m going for full custody.', 'I already told the kids you’re not coming.', 'I told them you don’t care about them.'].forEach(t => {
    const r = rw(t, 'coparent');
    chk(E.score(an(t), ['general'], 'text').level[0] === 'heavy', '“' + t + '” is heavy static (likely to escalate)');
    all(r).forEach(x => chk(!/court|lawyer|custody|never see|told (?:the kids|them)|to recap/i.test(x) && !brokenRx(x), '“' + t + '” rewrite keeps the threat or garbles: ' + x));
  });
  chk(/agree together on what we tell the kids/.test(rw('I already told the kids you’re not coming.').main), 'telling the kids first: ask to agree together');
  chk(/Could you pay child support by Friday\?/.test(rw('If you don’t pay child support by Friday, I’ll take you to court.').main), 'the wish under a court threat stays as a plain ask');
  chk(E.receive(an('My lawyer will be in touch.')).meanings.some(m => /court, a lawyer or custody/.test(m)), 'received court threat: named plainly');
  ['Can we talk about the custody schedule for summer?', 'I’ll take the kids to the park on Saturday.', 'I told the kids we’d get pizza Friday.', 'I told them you’d pick them up at 5.', 'My lawyer friend says hi.', 'We’ll see you at 6!'].forEach(t => chk(!an(t).found.legal && !an(t).found.kidsfirst && !an(t).found.softno, 'ordinary co-parent line “' + t + '” is not a threat'));
  // 7. the self-check never lets a broken sentence through
  ['You’re always correcting me with the baby, it is not respectful to me as her mother.', 'You always forget.', 'I already told the kids you’re not coming.', 'You’ll never see them again.'].forEach(t => all(rw(t)).forEach(x => chk(!brokenRx(x), 'self-check let through: ' + x)));
}
function brokenRx(x) { return /\b(?:a lot|much) (?:a lot|much)\b|To recap: (?:them|the kids)|\byou'll (?:rarely|often)\b|, it (?:is|was)[^.]*a lot\./i.test(x); }
// ---------- re-test: apologies keep their apology; the blame clause is the loudest part; no raw blanks ----------
{
  const an = t => E.analyze(t, { channel: 'text' });
  const t = 'Oh no, sorry!! I was totally distracted, I’m the worst 😩 but you didn’t have to say it like that';
  const r = E.rewrite(an(t), { wirings: ['general'], channel: 'text', rel: 'partner' });
  chk(/^Oh no, sorry!{1,2} I was totally distracted 😩 Separately, the way you said it stung a little\. Can we talk about that later\?$/.test(r.main), 'apology rewrite keeps the apology, drops the blame, no stray comma: ' + r.main);
  chk(r.changes.some(c => c.id === 'sorrybut'), 'the “but you…” change is explained');
  const g = E.receive(an(t));
  chk(g && !/didn't have to say it like that/.test(JSON.stringify(g.replies || [])), 'received: the blame is not read back as a reply');
  ['You always correct me with the baby.', 'You never help with bedtime.', 'You always leave the lights on.', 'You never call me back.'].forEach(m => {
    const x = E.rewrite(an(m), { wirings: ['general'], channel: 'text', rel: 'partner' });
    [x.main].concat(x.variants.map(v => v.text)).forEach(s => chk(!/\[one specific thing\] going forward/.test(s), 'raw blank in “' + m + '”: ' + s));
  });
  chk(!E.analyze('Sorry I’m late! Traffic was awful.', { channel: 'text' }).found.sorrybut, 'an apology with no blame is not flagged');
}
// ---------- round 4: a flagged phrase never stays in any version; work wording at work ----------
{
  const KEEP_OUT = ['excuse', 'count', 'hyper', 'stonewall'];
  M.filter(m => /know how I am|just how I am|help it|third time|second time|done doing|always me|again!/.test(m[1])).forEach(([rel, t]) => {
    const ch = rel === 'coworker' ? 'chat' : 'text';
    const an = E.analyze(t, { channel: ch });
    const work = rel === 'coworker' || rel === 'manager';
    const rw = E.rewrite(an, { wirings: ['general'], channel: ch, rel, work });
    const texts = [rw.main].concat(rw.variants.map(v => v.text));
    KEEP_OUT.forEach(id => (an.found[id] || []).filter(Boolean).forEach(w => texts.forEach(x => chk(!x.toLowerCase().includes(w.toLowerCase().replace(/’/g, "'")), '“' + w + '” (' + id + ') kept in: ' + x))));
    (an.found.absolute || []).filter(Boolean).forEach(w => chk(!rw.main.toLowerCase().includes(w.toLowerCase()), 'absolute “' + w + '” kept in: ' + rw.main));
    if (work) texts.forEach(x => chk(!/\b(?:guys|folks)\b|not blaming anyone|I am not against you/i.test(x), 'work wording: ' + x));
    if (/^Sorry/.test(t)) chk(/That's on me\./.test(rw.main), 'the apology owns it: ' + rw.main);
  });
  // the speaker's wiring is said to "you", the listener is "they"
  chk(/^you /.test(E.meantSelf('adhd', ['excuse']).text) && /them/.test(E.meantSelf('adhd', ['excuse']).text), 'meantSelf ADHD + excuse: ' + E.meantSelf('adhd', ['excuse']).text);
  // the "What it looks for" list: "Calm down" is dismissing; "Fine. Whatever." has its own gentler name
  const lf = P.lookForHTML();
  chk(!/Dismissing a feeling<\/b> <span class="lf-ex">\([^)]*Whatever/.test(lf) && /Brush-off, or quiet hurt<\/b> <span class="lf-ex">\(“Fine\. Whatever\.”/.test(lf), '“Fine. Whatever.” is listed as a brush-off, not as dismissing');
}
// ---------- round 7 testers: threats, digs, boundaries, co-parents, family and work ----------
{
  const an = t => E.analyze(t, { channel: 'text' });
  const W = rel => rel === 'coworker' || rel === 'manager' || rel === 'business';
  const rw = (t, rel) => E.rewrite(an(t), { wirings: ['general'], channel: 'text', rel: rel || 'partner', work: W(rel) });
  const vd = (t, rel) => { const a = an(t); const r = rw(t, rel); return E.verdict(a, E.score(a, ['general'], 'text'), r, { work: W(rel) }); };
  const rc = (t, rel) => E.receive(an(t), { rel: rel || '' });
  const all = r => [r.main].concat((r.variants || []).map(v => v.text));
  const PLAIN = /plain message|looks okay|probably fine to take it at face value/i;
  // 1. a threat, in both modes: named plainly, never "okay", never kept in a rewrite
  ["If you tell anyone about this, you'll be sorry.", "If you go out with your friends again I'll make you regret it.", "Do that and you'll regret it.", 'Pick up the kids or else.', "You'll pay for this.", "If you leave I'll make your life hell.", "If you leave me I'll take the kids."].forEach(t => {
    const v = vd(t), r = rw(t), g = rc(t);
    chk(v.id === 'danger' && /^This is a threat, not a tone problem\.$/.test(v.text), '“' + t + '” send: threat named plainly: ' + v.id + ' ' + v.text);
    chk(r.danger && all(r).every(x => !/regret|be sorry|or else|pay for|make your life|tell anyone|take the kids|\bhell\b/i.test(x)), '“' + t + '” rewrite keeps the threat: ' + all(r).join(' | '));
    chk(g.danger && g.head[0] === 'danger' && /threat, not a tone problem/.test(g.head[1]) && !g.meanings.some(m => PLAIN.test(m)), '“' + t + '” received: threat named, never “looks okay”: ' + JSON.stringify(g.head));
    chk(!g.replies.some(x => /sarcastic|not okay being spoken/i.test(x.text)), '“' + t + '” received: no escalating reply');
  });
  ["You'll regret not coming, the food was amazing!", "I'll pay for dinner tonight.", "You'll pay me back Friday?", "If you tell anyone happy birthday from me, they'll love it.", "If you can't make it, I'll pick up the kids."].forEach(t => chk(!an(t).danger, 'not a threat: “' + t + '”'));
  // 2. blame, scorekeeping and digs: flagged in both modes, with a kind rewrite that keeps the real ask
  [['partner', 'I managed fine without you for 7 months.', /^I got used to doing it my way while you were gone\. Can we pick which jobs you take back\?$/],
   ['partner', 'I managed fine without you for 7 months, so stop changing everything.', /^I got used to doing it my way while you were gone\. Can we pick which jobs you take back\?$/],
   ['partner', 'I did it alone for 7 months, I know how bedtime works.', /got used to my way\. Can we agree together how we do bedtime now\?$/],
   ['partner', 'It’s my money too, stop policing what I spend.', /^I'd like some money that's just mine to spend, and I'm happy to agree a limit for big things together\.$/],
   ['partner', 'You treat me like the help. I have a job too.', /^I'm working too, and when the house jobs default to me, I feel taken for granted\. Can we split \[one job, like the dog walks\]\?$/],
   ['friend', 'I guess I’m only your friend when it suits you.', /^I miss you and I've been feeling a bit left out\. Could we find ten minutes this week\?$/],
   ['coworker', 'Must be nice to just bake while I keep this whole place running.', /^I'm feeling stretched thin keeping this whole place running\. Could we look at the admin together and share some of it\?$/],
   ['coparent', 'Stop making decisions without me.', /^For school, health and new activities, can we text each other first and decide together\?$/],
   ['family', 'you’re not my mum so stop acting like it', /^I know you're trying\. I need some space right now, can we talk later\?$/],
   ['family', 'You are not my mom so stop acting like it', /^I know you're trying\. I need some space right now, can we talk later\?$/],
   ['family', 'ur not my mum stop acting like it', /^I know you're trying\. I need some space right now, can we talk later\?$/],
   ['family', 'So now you want to talk? After you took everything?', /^I'm still hurt about what happened\./],
   ['family', 'After you took everything you could.', /^I'm still hurt about what happened\./],
   ['partner', 'You treat me like a maid.', /taken for granted/],
   ['partner', 'Stop nagging me about the dishes.', /without reminders/],
   ['partner', 'I did everything by myself.', /got used to my way/],
   ['friend', 'Whenever it suits you, right?', /left out/]].forEach(([rel, t, want]) => {
    const v = vd(t, rel), r = rw(t, rel), g = rc(t, rel), a = an(t);
    chk(a.found.jab || a.found.sarcasm, '“' + t + '”: flagged as blame or a dig: ' + a.staticIds);
    chk(v.id === 'hurt' && /blame or a dig|may land as blame/.test(v.text) && !/probably land okay/.test(v.text), '“' + t + '” send verdict: ' + v.id + ' ' + v.text);
    chk(E.score(a, ['general'], 'text').level[0] !== 'clear', '“' + t + '”: never “clear” (the cue would say Go)');
    chk(want.test(r.main), '“' + t + '” [' + rel + '] rewrite: ' + r.main);
    chk(all(r).every(x => !/\[If you're sure|without you|policing|treat me like|when it suits|must be nice|not my m|stop changing|after you took|while you \w+ while/i.test(x)), '“' + t + '”: the jab stays in a version: ' + all(r).join(' | '));
    chk(g.head[0] === 'hurt' && !g.meanings.some(m => PLAIN.test(m)) && g.replies.length, '“' + t + '” received: flagged, header and body agree: ' + JSON.stringify(g.head) + ' ' + g.meanings[0]);
    chk(!g.replies.some(x => /sarcastic|literally/i.test(x.text)), '“' + t + '” received: no escalating reply');
  });
  chk(!/get a break/.test(rw('Must be nice to just bake while I keep this whole place running.', 'coworker').main), 'no invented ask (“a break”)');
  chk(rc('Must be nice to just bake while I keep this whole place running.', 'coworker').replies.some(x => /Sounds like you're stretched\. What would help most this week\?/.test(x.text)), 'received sarcasm: a kind reply');
  // 3. a hedge on an accusation is never turned into a plainer accusation
  ['I guess I’m only your friend when it suits you.', 'I think you did that to annoy me.', 'I guess you were too busy for me.'].forEach(t => all(rw(t, 'friend')).forEach(x => chk(!/\[If you're sure/.test(x), '“' + t + '” got the hedge template: ' + x)));
  // 4. "whenever" is not a deadline; family boundaries lead with warmth; received as a request about visits
  {
    const t = 'Mum, you can’t just turn up whenever you want. It’s our home.';
    ['family', 'partner', ''].forEach(rel => all(rw(t, rel)).forEach(x => chk(!/by \[a time\]|turn up by/.test(x), '“whenever” became a deadline [' + rel + ']: ' + x)));
    chk(rw(t, 'family').main === "Mum, I love seeing you. Could you text before you come over, so we can make sure it's a good time?", 'family visit boundary: ' + rw(t, 'family').main);
    const g = rc(t, 'family');
    chk(!JSON.stringify(g).match(/When do you need it by|timing is open/) && g.replies.some(x => x.text === "You're right, I'll text first. When suits you?"), 'received visit boundary: ' + JSON.stringify(g.replies));
    chk(!an('Call me whenever you want!').found.vtime, '“whenever you want” is an open door, not vague timing');
    chk(rw('Mum, we’ll decide about baptism ourselves.', 'family').main === "Mum, I know how much this means to you. We'll decide about baptism together, and tell you as soon as we do.", 'family decision: ' + rw('Mum, we’ll decide about baptism ourselves.', 'family').main);
    chk(vd('Mum, we’ll decide about baptism ourselves.', 'family').id === 'hurt', 'a closed door to a parent is flagged gently');
  }
  // 7. co-parents: BIFF (the child's need, the ask, a time), never feelings about each other
  {
    const t = 'You forgot her inhaler AGAIN. Do you even care?';
    const r = rw(t, 'coparent');
    chk(/^\[Child\]'s inhaler wasn't in her bag on \[day\]\. Please pack it before the \[day\] handoff\.$/.test(r.main), 'co-parent inhaler: ' + r.main);
    chk(rw('You forgot Lina’s inhaler again.', 'coparent').main.indexOf("Lina's inhaler wasn't in") === 0, 'co-parent inhaler, named child: ' + rw('You forgot Lina’s inhaler again.', 'coparent').main);
    ['You forgot her inhaler AGAIN. Do you even care?', 'You never help with homework. Do you even care?', 'You always forget her coat.', 'You always schedule things on my weekends on purpose.', 'Stop making decisions without me.'].forEach(m => all(rw(m, 'coparent')).forEach(x => chk(!/not feeling cared about|I'd like to talk about it|how it looks to you/i.test(x), 'co-parent rewrite reopens feelings: “' + m + '” → ' + x)));
    const wk = rw('You always schedule things on my weekends on purpose.', 'coparent');
    chk(/check the calendar together/.test(wk.main) && all(wk).every(x => !/on purpose/i.test(x)), 'co-parent weekends: ' + wk.main);
  }
  // 8. work: "That is incorrect." is flagged as cold, with one plain alternative; the sections agree
  {
    const t = 'That is incorrect. The deadline is Friday, not Thursday.';
    const v = vd(t, 'coworker'), r = rw(t, 'coworker');
    chk(/may land a bit cold/.test(v.text) && r.main === 'Quick correction: the deadline is Friday, not Thursday.', 'blunt correction: ' + v.text + ' / ' + r.main);
    const a = an(t); chk(!a.asks.length && a.found.blunt, 'blunt correction: no ask, the opener flagged');
  }
  // 9. intent words go; a calm boundary and coming out are caring; "maybe" never kept; "literally" has its own reason
  {
    ['You did that on purpose.', 'You deliberately left me out.', 'You always schedule things on my weekends on purpose.'].forEach(t => {
      chk(an(t).found.motive, '“' + t + '”: guessing a motive is flagged');
      all(rw(t, 'partner')).forEach(x => chk(!/on purpose|deliberately/i.test(x), '“' + t + '”: the motive stays in: ' + x));
    });
    const b = "If you can't respect my relationship, I'm going to leave for today. I love you and I'll call next week.";
    chk(!an(b).found.threat && !an(b).danger && an(b).found.boundary && /caring boundary/.test(vd(b, 'family').text) && !rc(b, 'family').crossed, 'a calm boundary is not a threat: ' + vd(b, 'family').text);
    chk(an("If you don't clean up, I'm leaving.").found.threat, 'an ultimatum is still an ultimatum');
    const c = "Mom, Dad, I need to tell you something. I'm bisexual, and Dani isn't just my roommate, she's my girlfriend.";
    chk(!an(c).found.ominous && an(c).found.disclose && !/might hurt/.test(vd(c, 'family').text) && /caring way to share/.test(vd(c, 'family').text), 'coming out is not “might hurt”: ' + vd(c, 'family').text);
    const j = rw('Can your boyfriend maybe not stay over every night? I can’t sleep.', 'roommate');
    chk(all(j).every(x => !/\bmaybe\b/i.test(x)) && /a few nights a week/.test(j.main), 'a flagged “maybe” never stays: ' + j.main);
    const l = rw('Your boyfriend is here EVERY night?? I literally can’t sleep.', 'roommate');
    chk(l.changes.every(c => !(c.from.includes('literally') && /Just/.test(c.why))), '“literally” gets its own reason');
    const lit = rw('I literally told you twice.', 'partner');
    chk(lit.changes.some(c => c.id === 'intens' && c.from.includes('literally') && /Literally/.test(c.why)), '“literally” reason: ' + JSON.stringify(lit.changes.map(c => [c.id, c.why.slice(0, 40)])));
    chk(!/might hurt/.test(vd('Your boyfriend is here EVERY night?? I literally can’t sleep.', 'roommate').text), 'a mild message is not “This might hurt”: ' + vd('Your boyfriend is here EVERY night?? I literally can’t sleep.', 'roommate').text);
    chk(/might hurt/.test(vd('You need to clean your room.', 'family').text), 'an order still says “might hurt”');
  }
  // 6. received: the header and the body always agree, and the escalating check is gone
  M.map(m => m[1]).concat(['I guess I’m only your friend when it suits you.', 'Mum, you can’t just turn up whenever you want. It’s our home.']).forEach(t => {
    const g = rc(t);
    if (g.head[0] !== 'ok') chk(!g.meanings.some(m => /plain message/.test(m)), 'received “' + t + '”: header ' + g.head[0] + ' but body says plain message');
    chk(!g.replies.some(x => /were you being sarcastic/i.test(x.text)), 'received “' + t + '”: escalating sarcasm check');
  });
}
// the shared list: the same line gets the same marks in the Conversation Reader
const R = require(path.join(__dirname, '../../assets/js/conversation-reader-engine.js'));
[['fine. whatever you want', /dismiss/], ['i don’t care', /dismiss/], ['whatevs', /dismiss/], ['Nobody asked you.', /contempt/], ['You are so autistic.', /verdict/], ['this is why nobody wants to deal with you', /contempt/], ['You are getting on my last fucking nerve', /swear|hostile/], ['You’re a total nightmare', /verdict/], ['It would be nice if someone helped around here.', /hint/], ['We need to talk.', /opener/], ['of course you did. I have to do everything around here', /sarcasm/], ['Fine. Whatever works for you.', /dismiss/], ['Sure, go out with your friends, I’ll just sit here.', /sarcasm/], ['Don’t mind me.', /passive/]].forEach(([t, want]) => {
  const kinds = R.read([{ who: 'A', text: t }], 'B').turns[0].marks.map(m => m.kind).join(' ');
  if (want.test(kinds)) pass++; else { fail++; errs.push('Reader disagrees on “' + t + '”: ' + kinds); }
});
errs.forEach(e => console.log('FAIL ' + e));
console.log(M.length + ' messages; ' + pass + ' passed, ' + fail + ' failed');
process.exitCode = fail ? 1 : 0;
