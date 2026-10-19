/* test-sig16.js — the round-16 reviewer panel's findings, as gates (Chat analyzer and the pocket checker).

   1. Contempt (mockery, disgust, looking down on them) is named, and no suggestion keeps it or leaves a dangling fragment.
   2. One verdict: the plain line and the level agree ("may hurt" never sits over "clear").
   3. Negation and self-reference aren't criticism (see also test-site-advice.js for the site's own openers).
   4. Co-parents and coworkers get a Firm (BIFF) version: the requirement as a plain statement, no feelings line, no
      "is that okay?", and a court or lawyer line left out with its reason.
   5. "Fine. Whatever. Do what you want, you always do.": the passive-aggressive pieces go, never repunctuated.
   6. The pocket checker lists what stood out and what the rewrite left out, with a short reason.
   7. A message to an ex: no "order" or "a no, or a limit" note, no "by [a time]", no polish; "sleep on it" first.
   8. "fine. go sleep" received: hurt, not done, with the actual word, and never "By when?".
   Also: replies never reuse a time from unrelated content, a denial isn't "always / never", and a question answered
   two lines later isn't "unanswered". node tools/signal/test-sig16.js [-v] */
'use strict';
const path = require('path');
const E = require(path.join(__dirname, '../../assets/js/signal-engine.js'));
const R = require(path.join(__dirname, '../../assets/js/conversation-reader-engine.js'));
const V = process.argv.includes('-v');
let fails = 0, n = 0;
function chk(ok, msg) { n++; if (!ok) { fails++; console.log('FAIL ' + msg); } else if (V) console.log('ok   ' + msg); }
function send(t, o) {
  o = o || {};
  const ctx = o.answer ? E.answerCtx(o.answer, null) : null;
  const an = E.analyze(t, { channel: 'text', ctx, mode: 'send' });
  const q = E.askFirst(an, { mode: 'send', rel: o.rel });
  const sc = E.score(an, ['general'], 'text');
  const rw = E.rewrite(an, { wirings: ['general'], channel: 'text', rel: o.rel, ctx, answer: o.answer });
  const v = E.verdict(an, sc, rw, { rel: o.rel, ctx, answer: o.answer });
  return { an, q, sc, rw, v, all: [rw.main].concat((rw.variants || []).map(x => x.text)) };
}
const CONTEMPT_LEFT = /\b(?:oh wow|of course you did|i don'?t know why i (?:even )?expected|must be exhausting|everyone can see|so busy|pathetic|why do i even bother|even a (?:child|toddler)|try to keep up|state of you)\b/i;
const DANGLING = /(?:^|[.!?]\s+)(?:and|but|so|or)\b[^.!?]{0,30}[.!?]/i;

// 1. contempt
[
  "Oh wow, you forgot AGAIN? Of course you did. Honestly I don't know why I expected anything from you. You're pathetic, and everyone can see it.",
  "Sure, because you're SO busy. Must be exhausting being you.",
  'You forgot the tickets, and everyone can see it.',
  "I don't know why I even bother with you. You never listen.",
  'Even a toddler could load a dishwasher. Could you do it tonight?',
  'Look at the state of you. Clean the kitchen.'
].forEach(t => {
  const r = send(t);
  chk(r.an.found.contempt || r.an.found.sarcasm, 'contempt is found: ' + t);
  chk(r.v.id !== 'ok' && r.v.id !== 'unsure', 'contempt is never "okay" or "hard to tell": ' + r.v.id + ' ' + t);
  r.all.forEach(x => {
    chk(!CONTEMPT_LEFT.test(x), 'no contempt kept in a suggestion: ' + x);
    chk(!DANGLING.test(x.replace(/\[[^\]]*\]/g, 'X')), 'no dangling fragment: ' + x);
  });
});
{ const r = send("Oh wow, you forgot AGAIN? Of course you did. Honestly I don't know why I expected anything from you. You're pathetic, and everyone can see it.");
  chk(/contempt: mocking them, or looking down on them/.test(r.v.text), 'contempt is named in plain words: ' + r.v.text);
  chk(/forgot \[the thing\]/.test(r.rw.main) && /hurt/.test(r.rw.main) && /\?/.test(r.rw.main), 'the rewrite keeps the event, the feeling and the ask: ' + r.rw.main);
  chk(E.FBY.contempt.name === 'Contempt: mockery or looking down on them', 'the feature is named "Contempt: mockery or looking down on them"'); }

// 2. one verdict: the level never says "clear" under a "may hurt" (the page's agreeLevel does the rest; here: the verdict
//    with "I'm upset with them" is not "ok", and the rewrite is a real change)
{ const r = send("Sure, because you're SO busy. Must be exhausting being you.", { answer: 'upset' });
  chk(r.v.id === 'hurt' || r.v.id === 'fight', 'upset + contempt: not okay: ' + r.v.id);
  chk(r.sc.level[0] !== 'clear', 'upset + contempt: the level is not "clear": ' + r.sc.level.join(' '));
  chk(!r.rw.unchanged, 'upset + contempt: a suggestion is offered'); }

// 3. negation
['Nothing’s wrong, I just want to plan the weekend.', 'i dont want to be annoying but could you keep it down after 11? i have an exam', 'It’s not your fault the bus was late.', "I don't think either of us is wrong."].forEach(t => {
  const r = send(t); chk(!r.an.found.critic && r.v.id === 'ok' && !r.q, 'negation is not criticism: ' + r.v.id + ' [' + r.an.staticIds + '] ' + t); });

// 4. firm (BIFF)
{ const r = send("I need you to text me by 3pm if you're running late. Maya waited 40 minutes on Friday. If this keeps happening I'll have to talk to my lawyer about the schedule.", { rel: 'coparent' });
  const f = (r.rw.variants || []).find(x => x.id === 'firm');
  chk(f && /^Please text me by 3pm if you're running late\. Maya waited 40 minutes on Friday\./.test(f.text), 'co-parent firm version: ' + (f && f.text));
  chk(f && r.rw.variants[0].id === 'firm' && r.rw.main === f.text, 'co-parents: the firm version comes first');
  chk(f && !/is that okay|not upset with you|I noticed|feel|lawyer/i.test(f.text), 'firm: no feelings line, no "is that okay", no "I noticed", no lawyer');
  chk(r.rw.changes.some(c => c.id === 'legal' && c.why), 'the lawyer line is left out, with a reason');
  const w = send('You need to send me the report by 5. The client asked twice.', { rel: 'coworker' });
  const fw = (w.rw.variants || []).find(x => x.id === 'firm');
  chk(fw && /^Please send me the report by 5\./.test(fw.text) && !/is that okay/i.test(fw.text), 'coworker firm version: ' + (fw && fw.text)); }

// 5. passive-aggressive openers
['Fine. Whatever. Do what you want, you always do.', 'Wow ok. Fine. Do whatever you want.', 'Fine. Whatever. Like you always do.'].forEach(t => {
  const r = send(t);
  r.all.forEach(x => {
    chk(!/(?:^|[.!?]\s)(?:Fine|Whatever|Wow ok)\./.test(x), 'no "Fine." / "Whatever." left: ' + x);
    chk(!/Do what(?:ever)? you want\?/.test(x), 'no stray question mark: ' + x);
  });
  chk(r.v.id === 'hurt' || r.v.id === 'fight', 'passive-aggressive opener flagged: ' + r.v.id + ' ' + t);
});

// 6. pocket checker transparency: the change log has a "taken out" entry for the lawyer line and "again"
{ const r = send('You were late AGAIN on Friday. Maya waited 40 minutes. If this keeps happening I\'ll have to talk to my lawyer about the schedule.', { rel: 'coparent' });
  const out = r.rw.changes.filter(c => !(c.to || []).filter(Boolean).length).map(c => c.id);
  chk(out.includes('legal') && out.includes('again'), 'left out: the lawyer line and "again": ' + out.join(',')); }

// 7. a message to an ex
['hey. i know we said no contact but i cant stop thinking about us. can we just talk? i miss you and i think we gave up too fast'].forEach(t => {
  [undefined, 'ex'].forEach(rel => {
    const r = send(t, { rel });
    chk(r.v.exReach && /^Before you send: want to sleep on it\?/.test(r.v.text), 'ex: "sleep on it" first (' + rel + '): ' + r.v.text);
    chk(!/sound like an order|a no, or a limit|kinder way/i.test(r.v.text + ' ' + (r.v.careNote || '')), 'ex: no "order" or "limit" note (' + rel + ')');
    chk(r.all.every(x => !/by \[a time\]/.test(x)) && r.rw.unchanged, 'ex: no "by [a time]", no polish (' + rel + ')');
    chk(!r.q, 'ex: no "joke or upset?" question');
  });
});
{ const r = send('Could you drop my spare key back by Friday?', { rel: 'ex' }); chk(!r.v.exReach && r.v.id === 'ok', 'ex, practical: read as usual'); }

// 8. shutdown, received
[['fine. go sleep', 'fine'], ['k.', 'k'], ['nothing. its fine', 'nothing'], ['ok', 'ok']].forEach(([t, w]) => {
  const rv = E.receive(E.analyze(t, { channel: 'text', mode: 'read' }), {});
  chk(rv.head[0] === 'hurt' && /hurt, not done/.test(rv.head[1]), 'shutdown read as maybe hurt: ' + t + ' -> ' + rv.head.join(' '));
  chk(rv.meanings.some(m => m.indexOf('“' + w + '”') !== -1), 'the actual word is named: ' + w);
  chk(!rv.replies.some(x => /by when/i.test(x.text)), 'never "By when?": ' + t);
});
{ const r = send('fine. go sleep'); chk(!/go sleep by \[a time\]/i.test(r.rw.main), 'send mode: never "Could you go sleep by [a time]?": ' + r.rw.main); }
{ const r = send('I felt hurt when you just said k. Can we talk tonight?'); chk(/tonight/.test(r.rw.unchanged ? r.an.text : r.rw.main) && !/\[the topic\]|\[a time\]/.test(r.rw.main), 'a time the writer gave is kept: ' + r.rw.main); }

// the whole-conversation reader
{ const p = R.parse("Chloe: are you still coming to Mia's birthday at 7?\nRyan: k.\nChloe: k? that's it?\nRyan: what do you want me to say. yes I'm coming\nChloe: I just want to feel like you actually want to talk to me\nRyan: I was at work. I can't write essays every time");
  const r = R.read(p.turns, 'Ryan', 'text');
  chk(!r.unanswered.some(u => /coming/.test(u.q)), 'a question answered two lines later is not "unanswered"');
  chk(!r.turns[5].marks.some(m => m.kind === 'absolute'), '"I can\'t write essays every time" is not always/never');
  chk(r.turns[4].marks.some(m => m.kind === 'repair'), 'a feelings-plus-wish bid counts as reaching out');
  chk(!(r.drafts || []).some(d => /\bat 7\b/.test(d.text)), 'replies never borrow "7" from the birthday'); }
{ const p = R.parse("Omar: hey sorry, work ran late\nHiba: ok\nOmar: are you upset?\nHiba: nothing. its fine\nOmar: I don't always do anything. I was literally working\nHiba: I waited up till 2am for your call\nHiba: fine. go sleep");
  const r = R.read(p.turns, 'Omar', 'text', { ctxText: 'long distance, 8 hours apart. He missed our call.' });
  chk(r.turns.filter(t => !t.mine && t.marks.some(m => m.kind === 'short' || m.kind === 'brief')).length >= 3, 'every short reply counts, not just "ok"');
  chk(!r.turns[4].marks.some(m => m.kind === 'absolute') && !(r.owns || []).some(o => /always do anything/.test(o.said)), 'a denial ("I don\'t always…") is not always/never');
  chk(r.topicGuess === 'the missed call', 'a tentative topic from the chat and context: ' + r.topicGuess);
  chk((r.next || []).some(m => m.key === 'short') && (r.drafts || []).some(d => /as in good, or fine as in not really/.test(d.text)), 'short replies: "hurt, not done", with a gentle question'); }

console.log('sig16 gates: ' + (n - fails) + ' passed, ' + fails + ' failed');
process.exit(fails ? 1 : 0);
