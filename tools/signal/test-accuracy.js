/* test-accuracy.js — release gates for the Chat analyzer's one-line verdict: it must never reassure someone about a
   message that could read as a threat, an insult, contempt, intimidation or pressure.

     node tools/signal/test-accuracy.js                 # both splits: confusion matrix, gates, exit 1 if a gate fails
     node tools/signal/test-accuracy.js --split tune    # only the tuning split
     node tools/signal/test-accuracy.js --misses        # also list every message that read outside its labels
     node tools/signal/test-accuracy.js --json          # the numbers as JSON

   The set (tools/signal/accuracy-set.json) is 800+ short made-up messages, each with the landing a careful reader
   would expect and the alternatives that are also fair: ok, unsure, might-hurt, fight, concern.
   "holdout" messages were written before the engine was changed and are never tuned against.

   Each message is read exactly the way the pocket checker (message-check-mini.js) and Professor Puddles read it:
   analyze -> score (general reading, text) -> rewrite -> verdict. */
'use strict';
const path = require('path');
const E = require(path.join(__dirname, '../../assets/js/signal-engine.js'));
const SET = require(path.join(__dirname, 'accuracy-set.json'));
const args = process.argv.slice(2);
const ONLY = args.includes('--split') ? args[args.indexOf('--split') + 1] : '';
const MISSES = args.includes('--misses'), JSON_OUT = args.includes('--json');

const LBL = ['ok', 'unsure', 'might-hurt', 'fight', 'concern', 'none'];
const OF = {ok: 'ok', unsure: 'unsure', hurt: 'might-hurt', fight: 'fight', danger: 'concern', none: 'none'};
// threat or intimidation: never "ok", in either split
const THREAT = ['threat', 'veiled', 'conditional', 'slang', 'playful'];
// clearly harmful: at most 2% "ok"
const HARMFUL = ['threat', 'veiled', 'conditional', 'slang', 'insult', 'contempt', 'control', 'ultimatum', 'swearat', 'pressure', 'workharsh'];
// warm or neutral: under 5% fight or concern, under 15% unsure
const NEG = ['warm', 'neutral', 'tricky', 'care'];

function read(t){
  const an = E.analyze(t, {channel: 'text'});
  const sc = E.score(an, ['general'], 'text');
  const rw = E.rewrite(an, {wirings: ['general'], channel: 'text'});
  const v = E.verdict(an, sc, rw, {});
  return {got: OF[v.id] || v.id, v, rw, an};
}

const pct = (a, b) => b ? Math.round(1000 * a / b) / 10 : 0;
const report = {};
let failed = false;
['tune', 'holdout'].forEach(split => {
  if(ONLY && ONLY !== split) return;
  const rows = SET.filter(c => c.split === split);
  const M = {}; LBL.forEach(a => { M[a] = {}; LBL.forEach(b => M[a][b] = 0); });
  let right = 0; const misses = [];
  const g = {threatN: 0, threatOk: [], harmN: 0, harmOk: [], negN: 0, negHot: [], negUnsure: []};
  rows.forEach(c => {
    const r = read(c.t);
    M[c.exp][r.got] = (M[c.exp][r.got] || 0) + 1;
    const fine = r.got === c.exp || (c.alt || []).includes(r.got);
    if(fine) right++; else misses.push(c.cat.padEnd(11) + ' want ' + [c.exp].concat(c.alt || []).join('/').padEnd(26) + ' got ' + r.got.padEnd(10) + ' ' + JSON.stringify(c.t));
    if(THREAT.includes(c.cat)){ g.threatN++; if(r.got === 'ok') g.threatOk.push(c.t); }
    if(HARMFUL.includes(c.cat)){ g.harmN++; if(r.got === 'ok') g.harmOk.push(c.t); }
    if(NEG.includes(c.cat)){ g.negN++; if(r.got === 'fight' || r.got === 'concern') g.negHot.push(c.t); if(r.got === 'unsure') g.negUnsure.push(c.t); }
  });
  const gates = [
    {name: 'threat or intimidation rated "ok"', got: g.threatOk.length, of: g.threatN, max: 0, pass: g.threatOk.length === 0, list: g.threatOk},
    {name: 'clearly harmful rated "ok" (max 2%)', got: g.harmOk.length, of: g.harmN, max: '2%', pass: pct(g.harmOk.length, g.harmN) <= 2, list: g.harmOk},
    {name: 'warm/neutral flagged fight or concern (under 5%)', got: g.negHot.length, of: g.negN, max: '<5%', pass: pct(g.negHot.length, g.negN) < 5, list: g.negHot},
    {name: 'warm/neutral flagged unsure (under 15%)', got: g.negUnsure.length, of: g.negN, max: '<15%', pass: pct(g.negUnsure.length, g.negN) < 15, list: g.negUnsure}
  ];
  if(gates.some(x => !x.pass)) failed = true;
  report[split] = {cases: rows.length, right, rate: pct(right, rows.length), matrix: M, gates: gates.map(x => ({name: x.name, got: x.got, of: x.of, pct: pct(x.got, x.of), pass: x.pass}))};
  if(JSON_OUT) return;
  console.log('\n== ' + split + ' (' + rows.length + ' messages): ' + right + ' read within their labels (' + pct(right, rows.length) + '%)');
  console.log('expected \\ got  ' + LBL.slice(0, 5).map(x => x.padStart(11)).join(''));
  LBL.slice(0, 5).forEach(a => console.log(a.padEnd(16) + LBL.slice(0, 5).map(b => String(M[a][b] || 0).padStart(11)).join('')));
  gates.forEach(x => {
    console.log((x.pass ? 'PASS ' : 'FAIL ') + x.name + ': ' + x.got + ' of ' + x.of + ' (' + pct(x.got, x.of) + '%)');
    if(!x.pass || MISSES) x.list.slice(0, 40).forEach(t => console.log('      ' + JSON.stringify(t)));
  });
  if(MISSES) { console.log('-- outside labels:'); misses.forEach(m => console.log('  ' + m)); }
});
if(JSON_OUT) console.log(JSON.stringify(report, null, 1));
else console.log(failed ? '\nA release gate failed.' : '\nAll release gates pass.');
process.exit(failed ? 1 : 0);
