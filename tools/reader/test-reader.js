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

console.log(`${pass} passed, ${fail} failed`);
if (fail) { errs.forEach(e => console.log('  - ' + e)); process.exit(1); }
