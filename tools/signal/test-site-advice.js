/* test-site-advice.js — the site's own suggested openers and scripts are never flagged as harsh.

   Every line in tools/signal/site-advice.json (built from the pages by build-site-advice.js --extract) goes through the
   same steps as the pocket checker and the Chat analyzer's "A message I'm about to send": no one-question-first, a verdict
   of "okay", and no rewrite that adds blame. Also: the same lines inside a longer message, the negation and self-reference
   cases reviewers met ("Nothing's wrong", "I don't want to be annoying"), and how many pass on the rules alone, without
   the guard list (the honest number for openers the site hasn't written yet).
   node tools/signal/test-site-advice.js [-v] */
'use strict';
const path = require('path');
const E = require(path.join(__dirname, '..', '..', 'assets/js/signal-engine.js'));
const LIST = require('./site-advice.json');
const V = process.argv.includes('-v');
let fails = 0;
function read(t, o) {
  o = o || {};
  const an = E.analyze(t, { channel: 'text', mode: 'send', noSiteAdvice: o.raw });
  const q = E.askFirst(an, { mode: 'send' });
  const sc = E.score(an, ['general'], 'text');
  const rw = E.rewrite(an, { wirings: ['general'], channel: 'text', rel: o.rel });
  const v = E.verdict(an, sc, rw, { rel: o.rel });
  return { an, q, v, rw };
}
function gate(name, bad, total, max) {
  const ok = bad.length <= (max || 0);
  if (!ok) fails++;
  console.log((ok ? 'PASS ' : 'FAIL ') + name + ': ' + bad.length + ' of ' + total + (max ? ' (max ' + max + ')' : ''));
  if (!ok || V) bad.slice(0, 25).forEach(x => console.log('    ' + x));
}
const held = [];
const flagged = [], asked = [], raw = [];
const usable = LIST.filter(o => {
  const an = E.analyze(o.t, { channel: 'text', noSiteAdvice: true });
  const bad = ['harm', 'menace', 'control', 'label', 'contempt', 'swear', 'hostile', 'sarcasm', 'jab', 'legal', 'kidsfirst', 'guilt', 'dxlabel', 'violent', 'threat', 'madefeel', 'blameq', 'invalid', 'calm', 'passiveag', 'withdraw', 'stonewall', 'motive', 'tone', 'demand', 'vemo'].some(id => an.found[id]);
  if (bad && !o.ok) { held.push(o.t); return false; } return true;
});
usable.forEach(o => {
  const r = read(o.t);
  if (r.q) asked.push(o.t + '  (' + o.src + ')');
  else if (r.v.id !== 'ok') flagged.push(r.v.id + ': ' + o.t + '  (' + o.src + ')');
  const g = read(o.t, { raw: true });
  if (g.q || g.v.id !== 'ok' && !(g.v.id === 'hurt' && g.v.mild)) raw.push((g.q ? 'question' : g.v.id) + ': ' + o.t);
});
console.log('Site openers and scripts: ' + LIST.length + ' lines from the pages (' + held.length + ' quoted with a put-down, threat or blame, left out by the builder)');
gate('a site opener flagged (anything but "okay")', flagged, usable.length);
gate('a site opener met with the one question first', asked, usable.length);
// inside a longer message: "Hey Sam! <opener>" and "<opener> Thanks x"
const inside = [];
usable.filter(o => E.splitSentences(o.t).length === 1).slice(0, 200).forEach(o => {
  const r = read(o.t + ' Thanks for hearing me out.');
  if (r.v.id === 'fight' || r.v.id === 'danger' || (r.v.id === 'hurt' && !r.v.mild)) inside.push(r.v.id + ': ' + o.t);
});
gate('a one-sentence opener plus "Thanks for hearing me out." read as harsh', inside, Math.min(200, usable.length));
// the reviewers' cases and their cousins: negation and self-reference never read as criticism of them
const NEG = [
  'Hey, can we find ten minutes this week to agree a few room things, like guests staying over? Nothing’s wrong, I’d just rather we sort it early than let it get awkward.',
  'Nothing’s wrong, I just want to plan the weekend. Can we talk tonight?',
  'nothing is wrong! just want to check the rota with you later',
  'i dont want to be annoying but could you keep it down after 11? i have an exam',
  'I don’t want to be annoying, but can we go over the bills on Sunday?',
  'Sorry if I’m being annoying, could you send me the address?',
  'It’s not your fault, the train was late. Can we push dinner to 8?',
  'I don’t think either of us is wrong. Could we find a middle way?',
  'I think I took that the wrong way. What did you mean?',
  'I can learn from what went wrong without deciding I’m the problem.',
  'You look really frustrated. Want a hand with that?',
  'No one did anything wrong, I just want us to agree a plan.',
  'I was wrong about the time, sorry! It starts at 7.',
  'I can’t write essays every time, but I’ll call you at lunch.',
  'I don’t always say it, but I notice what you do for us.',
  'I’m not annoyed, I just want to sort the bins out. Can we talk after dinner?',
  'I forget to reply, not because I don’t care. A quick nudge is fine.',
  'I’ve never done the tax return. Would you sit with me while I do it?'
];
const negBad = [];
NEG.forEach(t => { const r = read(t); if (r.an.found.critic || r.an.found.absolute || r.an.found.brushoff || r.q || (r.v.id !== 'ok' && !(r.v.id === 'hurt' && r.v.mild))) negBad.push(r.v.id + ' [' + r.an.staticIds.join(',') + ']: ' + t); });
gate('negation or self-reference read as criticism, always/never or a brush-off', negBad, NEG.length);
// and the negation guard doesn't hide real criticism
const STILL = ['Don’t be so annoying.', 'You’re always wrong about this.', 'You forgot again.', 'Nothing you do is ever right.', 'You never listen to me.', 'Why do you always have to make everything about you?'];
const stillBad = [];
STILL.forEach(t => { const r = read(t); if (r.v.id === 'ok') stillBad.push(t); });
gate('real criticism waved through by the negation rules', stillBad, STILL.length);
console.log('\nOn the rules alone (without the guard list), ' + (usable.length - raw.length) + ' of ' + usable.length + ' site openers read "okay" or only "a little sharper than you mean". The guard list catches the rest word for word.');
if (V) raw.forEach(x => console.log('    ' + x));
console.log(fails ? '\n' + fails + ' gate(s) failed.' : '\nAll site-advice gates pass.');
process.exit(fails ? 1 : 0);
