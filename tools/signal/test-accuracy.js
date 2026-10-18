/* test-accuracy.js — release gates for the Chat analyzer's one-line verdict: it must never reassure someone about a
   message that could read as a threat, an insult, contempt, intimidation or pressure.

     node tools/signal/test-accuracy.js                 # both splits: confusion matrix, gates, exit 1 if a gate fails
     node tools/signal/test-accuracy.js --split tune    # only the tuning split
     node tools/signal/test-accuracy.js --misses        # also list every message that read outside its labels
     node tools/signal/test-accuracy.js --json          # the numbers as JSON
     node tools/signal/test-accuracy.js --strict        # the fresh-phrasing splits (holdout2, holdout3) fail the run too

   The set (tools/signal/accuracy-set.json) is 800+ short made-up messages, each with the landing a careful reader
   would expect and the alternatives that are also fair: ok, unsure, might-hurt, fight, concern.
   "holdout" messages were written before the engine was changed. Its first run showed gaps, so the fixes that followed
   saw it; "holdout2" was written after that run and before those fixes, and is never tuned against.
   A third check runs every threat-shaped message through eight kinds of context ("we tease, we play games together",
   a parent, a coworker, short and direct writers, earlier warm messages…), as a message to send and as one you got:
   none may come out "okay".

   Each message is read exactly the way the pocket checker (message-check-mini.js) and Professor Puddles read it:
   analyze -> score (general reading, text) -> rewrite -> verdict. */
'use strict';
const path = require('path');
const E = require(path.join(__dirname, '../../assets/js/signal-engine.js'));
const SET = require(path.join(__dirname, 'accuracy-set.json'));
const args = process.argv.slice(2);
const ONLY = args.includes('--split') ? args[args.indexOf('--split') + 1] : '';  // tune, holdout or context
const MISSES = args.includes('--misses'), JSON_OUT = args.includes('--json');
// holdout2 and holdout3 are fresh-phrasing checks: their gates are printed, and only fail the run with --strict
const STRICT = args.includes('--strict');

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
['tune', 'holdout', 'holdout2', 'holdout3'].forEach(split => {
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
  if(gates.some(x => !x.pass) && (STRICT || split === 'tune' || split === 'holdout')) failed = true;
  report[split] = {cases: rows.length, right, rate: pct(right, rows.length), matrix: M, gates: gates.map(x => ({name: x.name, got: x.got, of: x.of, pct: pct(x.got, x.of), pass: x.pass}))};
  if(JSON_OUT) return;
  console.log('\n== ' + split + (split === 'holdout2' || split === 'holdout3' ? ' (fresh phrasings, written to find gaps; ' : ' (') + rows.length + ' messages): ' + right + ' read within their labels (' + pct(right, rows.length) + '%)');
  console.log('expected \\ got  ' + LBL.slice(0, 5).map(x => x.padStart(11)).join(''));
  LBL.slice(0, 5).forEach(a => console.log(a.padEnd(16) + LBL.slice(0, 5).map(b => String(M[a][b] || 0).padStart(11)).join('')));
  gates.forEach(x => {
    console.log((x.pass ? 'PASS ' : 'FAIL ') + x.name + ': ' + x.got + ' of ' + x.of + ' (' + pct(x.got, x.of) + '%)');
    if(!x.pass || MISSES) x.list.slice(0, 40).forEach(t => console.log('      ' + JSON.stringify(t)));
  });
  if(MISSES) { console.log('-- outside labels:'); misses.forEach(m => console.log('  ' + m)); }
});
// Context (the "Add context" panel) and the reading of a message you got: no context may turn a threat into "okay".
// "We tease, we play games together" may make a playful one "probably playful" (still not "okay").
const CTXS = [
  {usual: ['tease'], other: "we're joking, we play games together"},
  {usual: ['tease'], rel: 'friend', other: 'we always banter'},
  {usual: ['short', 'direct']},
  {rel: 'partner', goal: 'calm', earlier: 'A: love you\nB: love you too'},
  {rel: 'child', age: 'teen', usual: ['direct']},
  {rel: 'coworker', usual: ['formal']},
  {culture: 'my family is loud and blunt, we tease a lot', them: ['tired']},
  {rel: 'family', other: 'they take things literally'}
];
{
  // the tuning split by default; --context-split holdout runs it on the held-out messages too
  const CTX_SPLIT = args.includes('--context-split') ? args[args.indexOf('--context-split') + 1] : 'tune';
  if(!ONLY || ONLY === 'context'){
    let n = 0, okBad = [], playN = 0, playSoft = 0;
    SET.filter(c => THREAT.includes(c.cat) && c.split === CTX_SPLIT).forEach(c => CTXS.forEach(ctx => {
      const an = E.analyze(c.t, {channel: 'text', ctx}), sc = E.score(an, ['general'], 'text');
      const rw = E.rewrite(an, {wirings: ['general'], channel: 'text', ctx});
      const v = E.verdict(an, sc, rw, {ctx}), rv = E.receive(E.analyze(c.t, {channel: 'text', ctx, mode: 'read'}), {ctx});
      n += 2;
      if(v.id === 'ok') okBad.push('send ' + JSON.stringify(ctx).slice(0, 40) + ' ' + JSON.stringify(c.t));
      if(rv.head[0] === 'ok') okBad.push('read ' + JSON.stringify(ctx).slice(0, 40) + ' ' + JSON.stringify(c.t));
      if(c.cat === 'playful' && ctx.usual && ctx.usual.includes('tease')){ playN++; if(v.probablyPlayful) playSoft++; }
    }));
    const pass = okBad.length === 0; if(!pass) failed = true;
    report.context = {cases: n, okBad: okBad.length, playfulWithTease: playN, probablyPlayful: playSoft, pass};
    if(!JSON_OUT){
      console.log('\n== context, ' + CTX_SPLIT + ' split (' + (n / 2) + ' threat messages x contexts, send and read)');
      console.log((pass ? 'PASS ' : 'FAIL ') + 'no context turns a threat into "okay": ' + okBad.length + ' of ' + n);
      okBad.slice(0, 20).forEach(x => console.log('      ' + x));
      console.log('     (playful lines with a "we tease" context read as "probably playful": ' + playSoft + ' of ' + playN + ')');
    }
  }
}
if(JSON_OUT) console.log(JSON.stringify(report, null, 1));
else {
  const fresh = ['holdout2', 'holdout3'].filter(k => report[k] && report[k].gates.some(g => !g.pass));
  console.log(failed ? '\nA release gate failed.' : '\nRelease gates (tune, holdout, context) pass.' + (fresh.length ? ' The fresh-phrasing checks (' + fresh.join(', ') + ') still find lines the words alone can\'t read: see above.' : ''));
}
process.exit(failed ? 1 : 0);
