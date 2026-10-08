/* Tests for assets/js/conversation-reader-engine.js.  Run: node tools/reader/test-reader.js
   Covers pasted chat formats (Slack, Teams, Discord, bracketed times, iMessage/WhatsApp
   exports) and a few wording rules that first-time visitors tripped over. */
'use strict';
const path = require('path');
const R = require(path.join(__dirname, '../../assets/js/conversation-reader-engine.js'));

let pass = 0, fail = 0; const errs = [];
const ok = (c, m) => { if (c) pass++; else { fail++; errs.push(m); } };
const kinds = t => R.findMarks(t).map(m => m.kind);

// ---------- Parsing ----------
const PARSE = [
  { name: 'Slack (name, two spaces, time; follow-up with time only)',
    t: 'Priya Shah  10:02 AM\nCould you send whatever you have by 2?\nI want a look before the call.\nMarcus Lee  10:05 AM\nSure, sending now.\n10:06\nIt is rough though.',
    speakers: ['Priya Shah', 'Marcus Lee'], n: 3, first: 'Could you send whatever you have by 2?\nI want a look before the call.', time: '10:02 AM' },
  { name: 'Slack with a comma and date dividers',
    t: 'Today\nPriya Shah, 10:02 AM\nmorning!\nMarcus Lee, 10:04 AM\nmorning, all good?\n1 reply',
    speakers: ['Priya Shah', 'Marcus Lee'], n: 2 },
  { name: 'Discord / "Today at"',
    t: 'Priya — Today at 10:02 AM\ndid the build pass?\nMarcus — Today at 10:05 AM\nnot yet',
    speakers: ['Priya', 'Marcus'], n: 2, time: '10:02 AM' },
  { name: 'Teams "[10:02 AM] Name"',
    t: '[10:02 AM] Priya Shah\nCould you send the deck by 2?\n[10:04 AM] Marcus Lee\nYes, on it.',
    speakers: ['Priya Shah', 'Marcus Lee'], n: 2 },
  { name: '"[10:02] Name: msg"',
    t: '[10:02] Priya: hey\n[10:03] Marcus: hi there\n[10:04] Priya: can we talk later?',
    speakers: ['Priya', 'Marcus'], n: 3, time: '10:02' },
  { name: 'iMessage export',
    t: '[Jan 5, 2024 at 10:02 AM] Priya: hey\n[Jan 5, 2024 at 10:03 AM] Marcus: hi',
    speakers: ['Priya', 'Marcus'], n: 2 },
  { name: 'WhatsApp iOS export',
    t: '[05/01/2024, 10:02:11] Priya: hey\n[05/01/2024, 10:03:12] Marcus: hi',
    speakers: ['Priya', 'Marcus'], n: 2 },
  { name: 'WhatsApp Android export',
    t: '05/01/2024, 10:02 - Priya: hey\n05/01/2024, 10:03 - Marcus: hi',
    speakers: ['Priya', 'Marcus'], n: 2 },
  { name: 'Plain "Name:" lines with a time inside a message stay plain',
    t: 'Sam: see you at 10:30\nAlex: ok, see you at 10:30',
    speakers: ['Sam', 'Alex'], n: 2 },
  { name: 'No names: alternating paragraphs',
    t: 'did you get the milk\n\nnot yet',
    speakers: ['Them', 'You'], n: 2 }
];
PARSE.forEach(c => {
  const p = R.parse(c.t);
  ok(JSON.stringify(p.speakers) === JSON.stringify(c.speakers), `${c.name}: speakers ${JSON.stringify(p.speakers)}`);
  ok(p.turns.length === c.n, `${c.name}: expected ${c.n} turns, got ${p.turns.length}`);
  if (c.first) ok(p.turns[0] && p.turns[0].text === c.first, `${c.name}: first message was ${JSON.stringify(p.turns[0] && p.turns[0].text)}`);
  if (c.time) ok(p.turns[0] && p.turns[0].time === c.time, `${c.name}: first time was ${p.turns[0] && p.turns[0].time}`);
});

// ---------- Wording rules ----------
const MARKS = [
  { t: 'Could you send whatever you have by 2?', has: ['ask'], not: ['dismiss'] },
  { t: 'Whatever works for you is fine.', not: ['dismiss'] },
  { t: 'whatever.', has: ['dismiss'] },
  { t: 'ok whatever', has: ['dismiss'] },
  { t: 'Whatever', has: ['dismiss'] },
  { t: 'Can you just get it done?', has: ['demand'], not: ['ask'] },
  { t: 'Could you just send it?', has: ['demand'], not: ['ask'] },
  { t: 'Could you send it by Friday?', has: ['ask'], not: ['demand'] },
  { t: 'I just wanted to say thanks.', not: ['demand'] }
];
MARKS.forEach(c => {
  const k = kinds(c.t);
  (c.has || []).forEach(x => ok(k.includes(x), `"${c.t}": expected ${x}; got ${k.join(',')}`));
  (c.not || []).forEach(x => ok(!k.includes(x), `"${c.t}": did not expect ${x}`));
});
ok(!R.checkDraft('Can you just get it done?').checks[1].ok, 'draft "Can you just get it done?" should not tick "Makes one clear ask"');
ok(R.checkDraft('Could you send it by 2?').checks[1].ok, 'draft "Could you send it by 2?" should tick "Makes one clear ask"');

// ---------- Level and trend agree enough for the page's summary ----------
// The page says "never really heats up" only when it also ends calm.
const convs = [
  'A: hey can you look at the sink\nB: later\nA: when exactly?\nB: I said later\nA: ok fine.',
  'A: hi\nB: hi\nA: could you grab milk?\nB: sure',
  'A: you never help\nB: that is not fair\nA: whatever\nB: fine.'
];
convs.forEach(c => {
  const p = R.parse(c), r = R.read(p.turns, 'A', 'text');
  ok(['calm', 'warm', 'hot'].includes(r.level), 'level set');
  ok(['shutdown', 'rising', 'cooling', 'steady', 'short'].includes(r.trend), 'trend set');
});

// ---------- A first-time tester's threads (shared pattern list) ----------
[
  { t: 'Wow, nice of you to finally show up.', has: ['sarcasm'] },
  { t: 'Wow, thanks for nothing.', has: ['sarcasm'], not: ['warmth', 'repair'] },
  { t: 'SOME of us like having clean dishes 🙂', has: ['passive'], not: ['warmth'] },
  { t: 'must be nice', has: ['sarcasm'] },
  { t: 'no need to be rude', has: ['passive'] },
  { t: 'lol ok whatever you say 🙄', has: ['contempt'] },
  { t: 'I guess I’ll plan the trip again since nobody else will', has: ['passive'], not: ['absolute'] },
  { t: 'your sister always remembers', has: ['compare'] },
  { t: '…', has: ['withdraw'] },
  { t: 'I just can’t do this right now', has: ['withdraw'] },
  { t: 'I just can’t do this right now. Can we talk at 8?', has: ['pause'], not: ['withdraw'] },
  { t: 'hey everyone, dinner at 7?', not: ['absolute'] },
  { t: 'nobody ever listens to me', has: ['absolute'] },
  { t: 'you’re so good at it though!!', not: ['shouting'] },
  { t: 'love you too ❤️', has: ['warmth'], not: ['repair'] },
  { t: 'fine.', has: ['short'], not: ['dismiss'] },
  { t: 'k', has: ['short'], not: ['dismiss'] },
  { t: 'Per my last email, I need this ASAP.', has: ['pointed', 'demand'] }
].forEach(c => {
  const k = kinds(c.t);
  (c.has || []).forEach(x => ok(k.includes(x), `"${c.t}": expected ${x}; got ${k.join(',')}`));
  (c.not || []).forEach(x => ok(!k.includes(x), `"${c.t}": did not expect ${x}; got ${k.join(',')}`));
});
function readOf(text, me) { const p = R.parse(text); return R.read(p.turns, me || p.speakers[0], p.format === 'email' ? 'email' : 'text'); }
const roomies = readOf('Jess: did you see the kitchen?\nMe: yeah I’ll get to it\nJess: SOME of us like having clean dishes 🙂\nMe: ok\nJess: must be nice to just leave everything\nMe: no need to be rude\nJess: lol ok whatever you say 🙄', 'Me');
ok(roomies.level !== 'calm', 'contemptuous roommate thread must not end calm (got ' + roomies.level + ')');
const walls = readOf('Me: can we talk about the rent?\nSam: not now\nMe: it’s due Friday though\nSam: I said not now\nMe: ok when?\nSam: …', 'Me');
ok(walls.trend === 'shutdown', 'stonewalling thread reads as shut down (got ' + walls.trend + ')');
const workQ = readOf('Priya: Did you finish the report?\nMe: no', 'Me');
ok(!workQ.bids.length, 'a work question answered "no" is not good news met with a flat reply');
ok(!/thought|best/.test(readOf('A: I had the best idea\nB: what are your thoughts on it\nA: the thoughts are good').topic), 'no nonsense topics like "the thoughts" or "the best"');
const mail = readOf('Hi Sam,\nPer my last email, I need the deck ASAP.\nThanks,\nPat\n\nOn Mon, Mar 4, 2024 at 9:14 AM Sam Lee <sam@x.com> wrote:\n> Hi Pat, I’ll send the deck on Friday.\n>\n> On Fri, Mar 1, 2024 at 3:00 PM Pat Smith <pat@x.com> wrote:\n>> Could you send me the deck by Wednesday?', 'Sam Lee');
ok(/Wednesday/.test(mail.turns[0].text) && /Per my last/.test(mail.turns[mail.turns.length - 1].text), 'email thread reads oldest first');
ok(mail.turns[mail.turns.length - 1].who === 'Pat Smith', 'the unheadered newest email is from Pat (signed "Pat")');
ok(mail.level !== 'calm' || mail.peak >= 2, '"Per my last email … ASAP" is not praised as calm');
const pick = readOf('Dana: Could you do the school pickups on Tuesday and Thursday this week?\nMe: I always do them\nDana: I’m exhausted, I just need help this week\nMe: fine.', 'Me');
ok(pick.drafts.length >= 2 && pick.drafts.some(d => /school pickups/.test(d.text)), 'reply drafts use the thread’s own words');
ok(new Set([roomies, walls, pick, mail].map(r => r.drafts.map(d => d.text).join('|'))).size === 4, 'different threads get different reply drafts');
ok(!readOf('A: hi\nB: hi').next.some(m => /^Then:/.test(m.title)), 'no "Then:" without a first step');

// ---------- First-time testers, round two ----------
// the bins thread: hints, "always", "Fine." and "We need to talk" raise the heat; "k" is not an answer
const bins = readOf('A: Can you take the bins out tonight?\nB: k\nA: It would be nice if someone helped around here.\nB: I literally just got home. You always do this.\nA: Fine.\nB: We need to talk.', 'A');
ok(bins.level !== 'calm', 'bins thread must not read as calm (got ' + bins.level + ')');
ok(bins.turns[2].marks.some(m => m.kind === 'hint'), 'the hint is flagged');
ok(bins.turns[3].marks.some(m => m.kind === 'absolute'), '"you always do this" is flagged');
ok(bins.turns[5].marks.some(m => m.kind === 'opener'), '"We need to talk" is flagged');
ok(bins.turns[4].heat > 0, '"Fine." adds heat');
ok(bins.unanswered.some(u => u.at === 0 && u.flat === 'k'), '"k" is not counted as an answer to the bins question');
// sarcasm and a sweeping "everything"
const sarc = kinds('of course you did. I have to do everything around here');
ok(sarc.includes('sarcasm') && sarc.includes('absolute'), 'sarcasm + "I have to do everything" flagged; got ' + sarc.join(','));
// typos don't move the turn or lose the repair
const typo = readOf('Me: can you clen the kichen tonite?\nSam: sory, i forgot. i will do it now\nMe: you allways forget', 'Me');
const clean = readOf('Me: can you clean the kitchen tonight?\nSam: sorry, i forgot. i will do it now\nMe: you always forget', 'Me');
ok(typo.turns[1].marks.some(m => m.kind === 'repair'), 'a typo’d “sory” is still a repair');
ok(typo.turns[2].marks.some(m => m.kind === 'absolute'), 'a typo’d “allways” is still an absolute');
ok(JSON.stringify(typo.turns.map(t => t.heat)) === JSON.stringify(clean.turns.map(t => t.heat)), 'typos read the same as clean spelling: ' + typo.turns.map(t => t.heat) + ' vs ' + clean.turns.map(t => t.heat));
ok(typo.turned === clean.turned && typo.missedRepairs.length === clean.missedRepairs.length, 'typos don’t move where it turned or the repair advice');
ok(typo.turns[2].readAs.some(f => f.to === 'always'), 'the turn says what it read the typo as');
// swearing, fed-up lines and name-calling: the same reading as the Signal Translator
const hot = readOf('A: did you do the dishes\nB: You are getting on my last fucking nerve\nA: you’re a total nightmare', 'A');
ok(hot.turns[1].marks.some(m => m.kind === 'hostile') && hot.turns[1].marks.some(m => m.kind === 'swear'), 'hostile + swearing flagged');
ok(hot.turns[2].marks.some(m => m.kind === 'verdict'), 'name-calling is a verdict');
ok(hot.level === 'hot', 'a thread ending in name-calling reads hot (got ' + hot.level + ')');

// ---------- Second round of testers ----------
// the same lines read the same way, whatever the thread length
const sam8 = readOf('Sam: are you coming to dinner or not\nMe: I said I would think about it.\nSam: its been 3 days\nMe: I am still thinking.\nSam: wow ok. just tell me yes or no\nMe: No.\nSam: fine. whatever\nMe: You asked for yes or no.', 'Me');
const sam2 = readOf('Sam: fine. whatever\nMe: ok', 'Me');
ok(sam8.level === sam2.level && sam8.level === 'warm', 'same words, same verdict: long thread ' + sam8.level + ', short thread ' + sam2.level);
ok(sam2.trend !== 'shutdown' && sam8.trend !== 'shutdown', 'a plain “ok” is not shutting down');
ok(JSON.stringify(sam8.turns[6].marks.map(m => m.kind)) === JSON.stringify(sam2.turns[0].marks.map(m => m.kind)), '“fine. whatever” gets the same marks in both threads');
// a cruel line is flagged, the thread isn't "calm", and the hurt person's "ok" isn't coached
const cruel = readOf('Jordan: you forgot AGAIN. unbelievable.\nMe: I\'m sorry, I had a really hard day and I just\nJordan: you always have a hard day. everyone has hard days\nMe: ok\nJordan: don\'t "ok" me. this is why nobody wants to deal with you\nMe: I\'m going to go', 'Me');
ok(cruel.turns[4].marks.some(m => m.kind === 'contempt' && /nobody wants to deal with you/.test(m.text)), '“this is why nobody wants to deal with you” is flagged');
ok(cruel.level !== 'calm' && cruel.crossedThem, 'a thread ending in a put-down does not end calm (got ' + cruel.level + ')');
ok(!cruel.turns[3].marks.some(m => m.kind === 'short') && cruel.turns[3].heat === 0, 'the hurt person’s “ok” is not coached as the problem');
ok(cruel.next[0].key === 'line', 'first advice: this crossed a line, you can step away (got ' + cruel.next[0].key + ')');
ok(!cruel.next.concat(cruel.drafts).some(m => /not going anywhere/.test(m.script || m.text || '')), 'no “I’m not going anywhere” after “I’m going to go”');
// literal replies and figures of speech
const room = readOf('Jordan: hey are we still on for tonight\nMe: yes. 7pm. I will be there at 7pm.\nJordan: ok cool. maybe read the room a bit more this time lol\nMe: What room? We are meeting at the cafe.\nJordan: omg you know what i mean\nMe: I do not know what you mean. Please tell me directly.\nJordan: fine.\nMe: Is it fine or are you upset?\nJordan: whatever. forget it\nMe: Ok. I will forget it.', 'Me');
ok(room.turns[2].marks.some(m => m.kind === 'idiom' && /notice/.test(m.means)), '“read the room” is marked, with its meaning');
ok(room.literal.length && room.literal[0].reply === 3, '“What room?” is recognized as reading the figure of speech literally');
ok(room.next.some(m => m.key === 'literal'), 'the advice names the literal mismatch');
ok(!room.turns[9].marks.some(m => m.kind === 'withdraw') && room.turns[9].marks.some(m => m.kind === 'literal'), '“Ok. I will forget it.” is literal, not flooded');
ok(!/usually means/.test(R.KINDS.withdraw.hear), 'shutting the door: no overclaiming “usually means”');

// ---------- Couple usability round: both sides read, the topic, and the arc ----------
const lena = 'Lena: Hey, how was your day?\nDiego: Long. Meetings all afternoon.\nLena: Are we still on for a call tonight?\nDiego: I said maybe. Work is brutal this month.\nLena: I\'m always the one who reaches out.\nDiego: why are you being like this\nLena: Fine. Whatever works for you.\nDiego: I called you twice last week.\nLena: Once. And you hung up after five minutes.\nDiego: I can\'t do this right now.\nLena: Sure, go ahead, I\'ll just sit here.';
[['Lena', 'Diego'], ['Diego', 'Lena']].forEach(([me, other]) => {
  const r = readOf(lena, me);
  ok(r.turns[3].marks.some(m => m.kind === 'brushaside'), '“I said maybe” is brushing it aside');
  ok(r.turns[5].marks.some(m => m.kind === 'defend'), '“why are you being like this” is a defensive question');
  ok(r.turns[6].marks.some(m => m.kind === 'dismiss'), '“Fine. Whatever works for you.” is a brush-off');
  ok(r.turns[10].marks.some(m => m.kind === 'sarcasm'), '“Sure, go ahead, I’ll just sit here.” is sarcasm');
  const who = r.owns.map(o => o.who).sort().join(',');
  ok(who === 'Diego,Lena', 'own-your-part for both sides, read as ' + me + ' (got ' + who + ')');
  ok(r.owns[0].who === me, 'your own part comes first');
  ok(r.topic === 'staying in touch', 'topic is the recurring theme, not “work” (got ' + r.topic + ')');
  ok(r.level !== 'calm' && r.trend === 'rising', 'an escalating thread never “stays calm to the end” (got ' + r.level + '/' + r.trend + ')');
  ok(!r.drafts.some(d => /“always”\./.test(d.text)), 'own-your-part quotes the line, not one word');
});
ok(kinds('I’ll take the kids to the park on Saturday.').indexOf('threat') === -1, 'a park trip with the kids is not a threat');
ok(kinds('We’ll see you at 6!').indexOf('brushaside') === -1, '“We’ll see you at 6” is not a brush-off');
ok(kinds('Whatever works for you, I’m easy.').indexOf('dismiss') === -1, 'a real “whatever works for you, I’m easy” is not a brush-off');
const unsure = readOf('A: hey\nB: hi\nA: did you see the thing\nB: which one\nA: never mind, later\nB: ok');
ok(unsure.topic === '' , 'no recurring theme: no guessed topic (got ' + unsure.topic + ')');
const calm = readOf('A: Could you grab milk on the way home?\nB: Sure, 2% or whole?\nA: Whole, thanks!\nB: Got it. Home by 6.\nA: Love you\nB: Love you too');
ok(calm.level === 'calm' && !calm.owns.length, 'an ordinary thread still reads calm, with nothing to own');

// ---------- Screenshot import: OCR lines into bubbles (the browser test is tools/reader/ui-screens.js) ----------
const O = require(path.join(__dirname, '../../assets/js/conversation-reader-ocr.js'));
const L = (text, x0, y0, x1, y1, tint) => ({ text, conf: 92, bbox: { x0, y0, x1, y1 }, tint });
const pageA = { width: 1000, height: 2000, lines: [
  L('9:41', 60, 20, 140, 60), L('82%', 860, 20, 940, 60), L('Alex >', 450, 200, 560, 240),
  L('Today 9:30 PM', 400, 300, 600, 330),
  L('Can you take the bins out tonight?', 40, 400, 700, 440, 'them'),
  L('Sure, after dinner 9:31 PM vv', 600, 500, 960, 540, 'me'),
  L('It would be nice if someone helped', 40, 600, 720, 640, 'them'), L('around here.', 40, 650, 300, 690, 'them'),
  L('| literally just got home. You', 380, 760, 960, 800, 'me'), L('always do this.', 380, 810, 640, 850, 'me'),
  L('Delivered', 850, 870, 960, 895), L('iMessage', 60, 1900, 220, 1940) ] };
const pageB = { width: 1000, height: 2000, lines: [
  L('9:42', 60, 20, 140, 60), L('Alex >', 450, 200, 560, 240),
  L('I literally just got home. You', 380, 400, 960, 440, 'me'), L('always do this.', 380, 450, 640, 490, 'me'),
  L('Fine.', 40, 560, 160, 600, 'them'), L('Sorry. Can we talk at 87', 560, 660, 960, 700, 'me') ] };
const lay = O.layout([pageA, pageB]);
// the two OCR readings of one screenshot merge: a short bubble "No." never becomes "oO" plus "No"
{
  const bb = (x0, y0, x1, y1) => ({ x0, y0, x1, y1 });
  const m1 = O.mergeReads([{ text: 'oO', conf: 60, bbox: bb(640, 800, 700, 840) }, { text: 'wow ok. just tell me yes or no', conf: 88, bbox: bb(40, 700, 560, 740) }], [{ text: 'No.', conf: 90, bbox: bb(655, 798, 720, 842) }]);
  ok(m1.length === 2 && m1.some(l => l.text === 'No.') && !m1.some(l => /oO/.test(l.text)), 'short bubble merged cleanly: ' + JSON.stringify(m1.map(l => l.text)));
  const m2 = O.mergeReads([{ text: 'No', conf: 91, bbox: bb(655, 798, 715, 842) }], [{ text: 'No.', conf: 89, bbox: bb(655, 798, 720, 842) }]);
  ok(m2.length === 1 && m2[0].text === 'No.', 'the reading that keeps the full stop wins: ' + JSON.stringify(m2.map(l => l.text)));
  const m3 = O.mergeReads([{ text: 'hey are you home?', conf: 90, bbox: bb(40, 400, 500, 440) }], [{ text: 'No.', conf: 90, bbox: bb(655, 600, 720, 642) }]);
  ok(m3.length === 2, 'separate bubbles stay separate');
}
ok(lay.name === 'Alex', 'contact name from the header (got ' + lay.name + ')');
ok(lay.bubbles.map(b => b.side).join(',') === 'left,right,left,right,left,right', 'sides: ' + lay.bubbles.map(b => b.side + ':' + b.text).join(' | '));
ok(lay.bubbles.length === 6, 'the overlapping bubble is kept once: ' + lay.bubbles.length);
ok(lay.bubbles[1].text === 'Sure, after dinner', 'timestamps and ticks come off: ' + lay.bubbles[1].text);
ok(lay.bubbles[2].text === 'It would be nice if someone helped around here.', 'a wrapped bubble is one message');
ok(lay.bubbles[3].text === 'I literally just got home. You always do this.', '"|" is read as "I"');
ok(lay.bubbles[5].text === 'Sorry. Can we talk at 8?', 'a question mark read as 7 is fixed');
ok(!lay.bubbles.some(b => /Delivered|iMessage|9:4|Today|82%/.test(b.text)), 'no chat furniture');
const noHead = O.layout([{ width: 1000, height: 2000, lines: [L('hey are you home?', 40, 400, 500, 440), L('Thanks Jamie, on my way', 500, 500, 960, 540)] }]);
ok(noHead.name === 'Jamie', 'with no header, a greeting in my message names them (got ' + noHead.name + ')');

// ---------- long-distance re-test: the person who raised it, a fix that fits the speaker, always/never ----------
{
  const r = readOf(lena.split('\n').slice(0, 8).join('\n'), 'Lena');
  const me = r.owns.find(o => o.who === 'Lena');
  ok(me && me.asked === 'Are we still on for a call tonight?', 'Lena’s part leads with what she asked for (got ' + (me && me.asked) + ')');
  ok(me && me.kind === 'dismiss' && /quiet hurt/.test(me.label), 'Lena’s “whatever” reads as quiet hurt, not only dismissing (got ' + (me && me.label) + ')');
  ok(me && !/brushed it off/.test(me.script) && /What I’d like is/.test(me.script), 'Lena’s own-your-part says what she wants: ' + (me && me.script));
  ok(!r.owns.find(o => o.who === 'Diego').asked, 'only the person who asked gets an “asked for” label');
  const m = r.turns[6].marks.find(x => x.kind === 'dismiss');
  ok(m && m.resigned && R.KINDS.dismiss.resigned && !/I can tell this matters to you/.test(R.KINDS.dismiss.resigned.instead), 'a resigned “whatever” gets a fix that fits the speaker');
  ok(!R.findMarks('Calm down.').some(x => x.resigned), '“Calm down” is not resigned hurt');
  ok(/need underneath may be fair/i.test(R.KINDS.absolute.need) && /one example and one ask/.test(R.KINDS.absolute.need), 'always/never notes the need may be fair');
}

// ---------- re-test: one name for a resigned "whatever", and a pattern you've noticed isn't a verdict ----------
{
  const r = R.read([{ who: 'Diego', text: 'Can’t tonight, sorry.' }, { who: 'Lena', text: 'Fine. Whatever works for you.' }, { who: 'Diego', text: 'Calm down.' }], 'Lena');
  ok(r.resignedMe === 1 && r.resignedThem === 0, 'the resigned “whatever” is counted for the table (got ' + r.resignedMe + '/' + r.resignedThem + ')');
  ok(r.tallyThem.dismiss === 1 && r.resignedThem === 0, '“Calm down” stays “Dismissing”');
  ok(R.KINDS.dismiss.resigned.label === 'Brush-off, or quiet hurt', 'the gentler label is the card’s');
  const pat = R.findMarks('I’m always the one who reaches out.').find(m => m.kind === 'need');
  ok(pat && pat.pattern, '“I’m always the one who reaches out” names a pattern');
  ok(!R.findMarks('I’m always the one who reaches out.').some(m => m.kind === 'absolute'), '“I’m always the one who reaches out” is a need named, not always/never heat');
  ok(/isn’t the same as a verdict/.test(R.KINDS.absolute.pattern), 'always/never has the pattern note');
  const not = R.findMarks('You never listen.').find(m => m.kind === 'absolute');
  ok(not && !not.pattern, '“You never listen” is not marked as a noticed pattern');
  ok((R.findMarks('I never get a call back.').find(m => m.kind === 'need') || {}).pattern, '“I never get a call back” names a pattern');
  // in Lena and Diego's thread, Lena's line is counted as a need, not under "Always / never", and adds no heat
  [['Lena', 'Diego'], ['Diego', 'Lena']].forEach(([me]) => {
    const r2 = readOf(lena, me), side = me === 'Lena' ? r2.tallyMe : r2.tallyThem;
    ok(side.need === 1 && !side.absolute, 'Lena’s “I’m always the one who reaches out” is counted as Need named (read as ' + me + '): ' + JSON.stringify(side));
    ok(r2.turns[4].heat === 0, 'a named need adds no heat (got ' + r2.turns[4].heat + ')');
  });
  ok(R.KINDS.need.label === 'Need named' && /^This names a real need/.test(R.KINDS.need.hear), 'the need note leads with “This names a real need”');
}

// the box's placeholder and the example thread fit any couple or friends: no shared home assumed
{
  const fs = require('fs');
  const html = fs.readFileSync(path.join(__dirname, '../../conversation-reader.html'), 'utf8'), ui = fs.readFileSync(path.join(__dirname, '../../assets/js/conversation-reader.js'), 'utf8');
  const ph = (html.match(/id="cr-input"[^>]*placeholder="([^"]*)"/) || [])[1] || '', ex = (ui.match(/var EXAMPLE = \[([\s\S]*?)\]\.join/) || [])[1] || '';
  ok(ph && !/sink|kitchen|garage|dishes|laundry/i.test(ph), 'placeholder assumes a shared home: ' + ph);
  ok(ex && !/sink|kitchen|garage|dishes|laundry/i.test(ex), 'example thread assumes a shared home');
  const ex2 = ex.split('\n').map(l => (l.match(/'(.*)',?\s*$/) || [])[1]).filter(Boolean).map(l => l.replace(/\\'/g, "'")).join('\n');
  const rex = readOf(ex2, 'Sam'); ok(rex.turns.length === 10 && rex.turns.some(t => t.marks.some(m => m.kind === 'repair')), 'the example thread still reads, with a repair attempt');
}

console.log(`${pass} passed, ${fail} failed`);
if (fail) { errs.forEach(e => console.log('  - ' + e)); process.exit(1); }
