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

console.log(`${pass} passed, ${fail} failed`);
if (fail) { errs.forEach(e => console.log('  - ' + e)); process.exit(1); }
