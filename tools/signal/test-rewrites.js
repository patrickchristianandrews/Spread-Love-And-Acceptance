/* test-rewrites.js — gates for every suggested rewrite: the Chat analyzer's "clearer way to say it" (E.rewrite, also used
   by the pocket checker and Professor Puddles) and "Help me write it" (write-helper.js: Ask for a change, Reply to
   something that stung).

     node tools/signal/test-rewrites.js            # summary and gates, exit 1 if a gate fails
     node tools/signal/test-rewrites.js --list     # also print each failing case

   The gates:
     1. a threat is never turned into a polished, softer threat: no rewrite (or variant) of a threat still reads as one
     2. a threat is replaced by a feeling or a need ("I'm really frustrated with you right now")
     3. the person's ask is kept (the "keep" words are still in the main suggestion)
     4. nothing is invented: no names, numbers, days or times that weren't in the message (blanks in [brackets] are fine)
     5. nothing adds pressure, guilt or blame that wasn't there (no new guilt, threat, label, put-down, sarcasm, jab,
        "always/never", urgency or ultimatum in any suggestion)
   Cases: every threat-shaped message in accuracy-set.json, threats with a real ask inside, the corpus messages with
   an ask to keep, harsh messages that aren't threats, and "Help me write it" inputs. All made up. */
'use strict';
const path = require('path');
const E = require(path.join(__dirname, '../../assets/js/signal-engine.js'));
const P = require(path.join(__dirname, '../../assets/js/message-patterns.js'));
const K = require(path.join(__dirname, '../../assets/js/write-helper.js')).TOLWriteKit;
const LIST = process.argv.includes('--list');
const SET = require(path.join(__dirname, 'accuracy-set.json'));
const CORPUS = require(path.join(__dirname, 'corpus.json')).concat(require(path.join(__dirname, 'holdout.json')));

// threats with a real ask or fact inside them: the ask stays, the threat goes
const THREAT_ASKS = [
  ['Clean your room or I\'ll smack you', ['clean your room']],
  ['Get home now or I\'ll beat you', ['get home']],
  ['Can you grab milk? Also you\'re dead when I see you for telling Mum.', ['grab milk']],
  ['Pick up the kids at 3. If you forget again I swear I\'ll hit you.', ['pick up the kids at 3']],
  ['Turn the music down or I\'m going to smash your phone', ['turn the music down']],
  ['Pay me back by Friday. I know where you live.', ['pay me back by friday']],
  ['Text me when you land. If you don\'t, I\'ll slap you.', ['text me when you land']],
  ['Feed the dog or I\'ll kick your butt', ['feed the dog']],
  ['Bring my charger back. Keep ignoring me and see what happens.', ['bring my charger back']],
  ['Could you call your mum tonight? Don\'t test me on this.', ['call your mum tonight']],
  ['Do the dishes or I\'ll punch you', ['do the dishes']],
  ['Can we talk at 8? You better watch yourself until then.', ['talk at 8']],
  ['Move your car or I\'ll wreck it', ['move your car']],
  ['Give me my keys back or I\'ll hurt you', ['give me my keys back']],
  ['Please stop yelling. If you yell again I\'m going to slap you.', ['please stop yelling']],
  ['Thanks for dinner. But if you ever talk to my sister like that again I\'ll hit you.', ['thanks for dinner']],
  ['Can you send the report by 5? Or I\'ll make your life very hard.', ['send the report by 5']],
  ['Walk the dog before 6 or I\'ll whoop you', ['walk the dog before 6']],
  ['Answer your phone. Next time you ignore me I\'m going to punch you.', ['answer your phone']],
  ['I need the car on Saturday. Don\'t make me hurt you.', ['i need the car on saturday']],
  ['Help me with the shopping or you\'re dead', ['help me with the shopping']],
  ['Can you stop leaving towels on the floor? Seriously, keep it up and you\'ll get a slap.', ['stop leaving towels on the floor']],
  ['Be home by 10. You\'ve been warned.', ['be home by 10']],
  ['Can you return my jacket? I\'ll end you if it\'s ruined.', ['return my jacket']],
  ['Finish your homework or I\'ll knock you out', ['finish your homework']]
];
// "Help me write it": Ask for a change (the flip), and Reply to something that stung (fact, feeling, ask)
const WRITE_ASK = [
  ['You never listen, keep it up and I\'ll slap you', 'listen'],
  ['You never do the dishes and I swear I\'ll smack you', 'do the dishes'],
  ['He never picks up the kids, I\'m going to kill him', 'pick up the kids'],
  ['You always leave your shoes out and I\'ll break your neck one day', 'leave your shoes out'],
  ['You don\'t call me back, I know where you live', 'call me back'],
  ['She never pays rent on time, I\'ll beat her up', 'pay'],
  ['You never help with dinner. Try me.', 'help with dinner'],
  ['You don\'t text when you\'re late, you\'re dead', 'text when you'],
  ['I know where you live', ''],
  ['Keep talking and see what happens', ''],
  ['I\'m going to slap you', ''],
  ['You never take the bins out', 'take the bins out'],
  ['You always interrupt me', 'interrupt me'],
  ['He never says thank you', 'say thank you']
];
const WRITE_REPLY = [
  ['you yelled at me in front of everyone', 'hurt', 'stop or I\'ll punch you', 'you yelled at me in front of everyone'],
  ['you laughed at my job', 'embarrassed', 'apologise or you\'re dead', 'you laughed at my job'],
  ['I\'ll slap you', 'angry', 'tell me before you invite people', 'tell me before you invite people'],
  ['you forgot my birthday', 'hurt', 'put it in your calendar', 'put it in your calendar'],
  ['you read my messages', 'upset', 'ask me first next time', 'ask me first next time'],
  ['you cancelled again', 'frustrated', 'keep cancelling and see what happens', 'you cancelled again']
];

const PRESSURE = ['guilt', 'threat', 'menace', 'harm', 'label', 'contempt', 'sarcasm', 'jab', 'blameq', 'madefeel', 'compare', 'demand', 'withdraw', 'passiveag', 'hostile', 'swear', 'urgent', 'absolute', 'again', 'count', 'past', 'dxlabel', 'control', 'kidsfirst', 'legal', 'violent'];
const FEEL_RX = /\b(?:frustrated|angry|upset|hurt|worried|really upset|matters to me|i need|what i need|take a break)\b/i;
const strip = s => String(s || '').replace(/\[[^\]]*\]/g, ' ').replace(/[’‘]/g, "'");
const isThreat = t => { const a = E.analyze(t, {channel: 'text'}); const h = P.harm(t); return !!(a.danger || a.found.harm || a.found.menace || a.found.violent || (h && !h.playful)); };
function invented(input, out){
  const inp = strip(input).toLowerCase(), bad = [];
  const o = strip(out);
  (o.match(/\b\d+(?::\d+)?\b/g) || []).forEach(n => { if(!inp.includes(n)) bad.push(n); });
  (o.match(/\b(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|tonight|tomorrow|today|morning|afternoon|evening|weekend|noon|midnight)\b/gi) || []).forEach(w => { if(!inp.includes(w.toLowerCase())) bad.push(w); });
  // a capitalised word mid-sentence is usually a name
  (String(out || '').replace(/[’‘]/g, "'").match(/\b[a-z]+,? ([A-Z][a-z]{2,})\b/g) || []).forEach(x => { const w = x.split(' ').pop(); if(!inp.includes(w.toLowerCase())) bad.push(w); });
  return bad;
}
function addedPressure(input, out){
  const a = E.analyze(input, {channel: 'text'}), b = E.analyze(strip(out), {channel: 'text'});
  return PRESSURE.filter(id => b.found[id] && !a.found[id]);
}

const gates = {
  noThreat: {name: 'no rewrite of a threat still reads as a threat', n: 0, bad: []},
  feeling:  {name: 'a threat is replaced by a feeling or a need', n: 0, bad: []},
  keep:     {name: 'the ask is kept', n: 0, bad: []},
  invent:   {name: 'nothing invented (names, numbers, days, times)', n: 0, bad: []},
  pressure: {name: 'no added pressure, guilt or blame', n: 0, bad: []}
};
const fail = (g, t, why) => gates[g].bad.push(JSON.stringify(t) + (why ? '  ->  ' + why : ''));
let cases = 0, playfulKept = 0, playfulN = 0;
function rewriteOf(t){ const an = E.analyze(t, {channel: 'text'}); return {an, rw: E.rewrite(an, {wirings: ['general'], channel: 'text'})}; }
function texts(rw){ return [rw.main].concat((rw.variants || []).map(v => v.text)).filter(Boolean); }
function checkCommon(t, outs){
  outs.forEach(o => {
    gates.invent.n++; const inv = invented(t, o); if(inv.length) fail('invent', t, o + ' [' + inv.join(', ') + ']');
    gates.pressure.n++; const pr = addedPressure(t, o); if(pr.length) fail('pressure', t, o + ' [' + pr.join(', ') + ']');
  });
}

// 1. every threat-shaped message in the accuracy set, and threats with an ask inside
const threatMsgs = SET.filter(c => ['threat', 'veiled', 'conditional', 'slang', 'workharsh'].includes(c.cat)).map(c => [c.t, []]).concat(THREAT_ASKS);
threatMsgs.forEach(([t, keep]) => {
  const {an, rw} = rewriteOf(t);
  const threat = !!(an.danger || an.found.harm || an.found.menace || an.found.violent);
  if(!threat) return;
  cases++;
  if(an.harm && an.harm.playful && !an.found.menace) { playfulN++; if(rw.unchanged) playfulKept++; return; }
  const outs = rw.unchanged ? [an.text] : texts(rw);
  outs.forEach(o => { gates.noThreat.n++; if(isThreat(o)) fail('noThreat', t, o); });
  gates.feeling.n++; if(rw.unchanged || !FEEL_RX.test(rw.main)) fail('feeling', t, rw.main);
  (keep || []).forEach(k => { gates.keep.n++; if(!strip(rw.main).toLowerCase().includes(k.toLowerCase())) fail('keep', t, rw.main + ' [lost "' + k + '"]'); });
  checkCommon(t, rw.unchanged ? [] : outs);
});
// 2. playful threats: the writer's own words are kept, never "improved" into something else
SET.filter(c => c.cat === 'playful').forEach(c => { const {an, rw} = rewriteOf(c.t); if(an.found.menace) return; cases++; playfulN++; if(rw.unchanged) playfulKept++; });
// 3. the corpus messages with an ask to keep
CORPUS.filter(c => c.keep).forEach(c => {
  cases++;
  const {an, rw} = rewriteOf(c.t);
  c.keep.forEach(k => { gates.keep.n++; if(!strip(rw.main).toLowerCase().includes(k.toLowerCase())) fail('keep', c.t, rw.main + ' [lost "' + k + '"]'); });
  if(!rw.unchanged) checkCommon(c.t, [rw.main]);
});
// 4. harsh messages that aren't threats: the rewrite adds no new blame, guilt or pressure, and invents nothing
SET.filter(c => ['insult', 'contempt', 'sarcasm', 'passive', 'guilt', 'ultimatum', 'silent', 'swearat', 'complaint', 'pressure', 'control'].includes(c.cat)).forEach(c => {
  cases++;
  const {rw} = rewriteOf(c.t);
  if(!rw.unchanged && !rw.danger) checkCommon(c.t, [rw.main]);
});
// 5. "Help me write it": Ask for a change
WRITE_ASK.forEach(([t, keep]) => {
  cases++;
  const r = K.flip.run(t, 'complaint');
  const out = r && (r.send || r.text) || '';
  gates.noThreat.n++; if(isThreat(out)) fail('noThreat', '[write: ask] ' + t, out);
  if(/\b(?:slap|smack|punch|kill|dead|hurt|beat|break your|know where you live|see what happens|try me)\b/i.test(t)){ gates.feeling.n++; if(!r.threat) fail('feeling', '[write: ask] ' + t, out); }
  if(keep){ gates.keep.n++; if(!strip(out).toLowerCase().includes(keep.toLowerCase())) fail('keep', '[write: ask] ' + t, out + ' [lost "' + keep + '"]'); }
  gates.invent.n++; const inv = invented(t, out); if(inv.length) fail('invent', '[write: ask] ' + t, out + ' [' + inv.join(', ') + ']');
});
// 6. "Help me write it": Reply to something that stung
WRITE_REPLY.forEach(([fact, feel, ask, keep]) => {
  cases++;
  const out = K.stingLine(fact, feel, ask);
  gates.noThreat.n++; if(isThreat(out)) fail('noThreat', '[write: reply] ' + [fact, feel, ask].join(' / '), out);
  gates.keep.n++; if(!out.toLowerCase().includes(keep.toLowerCase())) fail('keep', '[write: reply] ' + [fact, feel, ask].join(' / '), out + ' [lost "' + keep + '"]');
  gates.pressure.n++; const pr = addedPressure(fact + '. ' + ask, out).filter(id => !['blameq'].includes(id)); if(pr.length) fail('pressure', '[write: reply] ' + fact, out + ' [' + pr.join(', ') + ']');
});

let failed = false;
console.log('Rewrites: ' + cases + ' cases (' + playfulN + ' playful lines, ' + playfulKept + ' left in the writer\'s own words)');
Object.keys(gates).forEach(k => {
  const g = gates[k], ok = g.bad.length === 0; if(!ok) failed = true;
  console.log((ok ? 'PASS ' : 'FAIL ') + g.name + ': ' + (g.n - g.bad.length) + '/' + g.n);
  if(!ok || LIST) g.bad.slice(0, LIST ? 999 : 12).forEach(b => console.log('      ' + b));
});
console.log(failed ? 'A rewrite gate failed.' : 'All rewrite gates pass.');
process.exit(failed ? 1 : 0);
