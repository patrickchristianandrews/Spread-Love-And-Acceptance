/* eval.js — how often the Text message checker (Signal Translator) reads a message the way a person would.

     node tools/signal/eval.js            # summary: level accuracy, precision/recall per label, every miss
     node tools/signal/eval.js --json     # the same numbers as JSON (for the page's "How accurate is this?" note)
     node tools/signal/eval.js --quiet    # summary only, no list of misses
     node tools/signal/eval.js --file holdout.json   # the held-out set, written after tuning and never tuned on
     node tools/signal/eval.js --regress  # fails if a message that read right before now reads wrong (corpus-pass.json)
     node tools/signal/eval.js --save-pass  # record which messages read fully right now, for --regress

   The corpus (tools/signal/corpus.json) is a set of realistic messages written by hand, each with what a careful
   human reader would say about it:
     lvl   how it may land: "kind", "clear", "a little sharp", "sharp", "very sharp" (or a list when two are fair; "*" = not scored)
     f     every label that applies (request, hint, blame, sarcasm, absolutes, guilt, withdrawal, apology, banter,
           gratitude, boundary, control, threat, crisis, edge)
     maybe labels that are fair either way (not counted as a miss or a false alarm)
     keep  words the suggested rewrite must keep (the ask)
   Every rewrite is also checked for added promises ("I promise", "it won't happen again") the writer never made.

   The engine is the same one the page runs, with the general reading (no wiring picked) on a text channel
   (work chat for coworkers, managers and business partners). */
'use strict';
const path = require('path');
const E = require(path.join(__dirname, '../../assets/js/signal-engine.js'));
const args = process.argv.slice(2);
// --file holdout.json reads another labelled set (the held-out messages written after tuning)
const FILE = args.includes('--file') ? args[args.indexOf('--file') + 1] : 'corpus.json';
const CORPUS = require(path.join(__dirname, FILE));
const JSON_OUT = args.includes('--json'), QUIET = args.includes('--quiet');

const LEVELS = ['kind', 'clear', 'a little sharp', 'sharp', 'very sharp'];
const WORK = ['coworker', 'manager', 'business'];
const has = (an, ids) => ids.some(id => !!an.found[id]);
const YOU = /\b(?:you|your|yours|yourself|you're|youre|u|ur)\b/i;
const LABELS = {
  request:    an => an.asks.length > 0,
  hint:       an => has(an, ['hint']),
  // blame: a named blame pattern, or "always / never / again" aimed at the listener ("You never listen", "You're late again"),
  // which the page explains as turning one moment into a verdict on the person
  blame:      an => has(an, ['blameq', 'label', 'shouldhave', 'madefeel', 'critic', 'compare', 'jab', 'contempt', 'dxlabel', 'past', 'count', 'sorrybut', 'invalid', 'calm', 'hostile', 'passive', 'kidsfirst'])
                    || (has(an, ['absolute', 'again']) && YOU.test(an.norm) && !an.banter),
  sarcasm:    an => has(an, ['sarcasm']),
  absolutes:  an => has(an, ['absolute']),
  guilt:      an => has(an, ['guilt']),
  // "whatever" on its own is read as one short reply (minimal) that the page names as a brush-off
  withdrawal: an => has(an, ['withdraw', 'stonewall', 'brushoff']) || (has(an, ['minimal']) && /whatev|if you say so|como quieras/i.test(an.norm)),
  apology:    an => !!an.apology || has(an, ['repair']),
  banter:     an => !!an.banter,
  gratitude:  an => has(an, ['appreciation']),
  boundary:   an => has(an, ['boundary']),
  control:    an => !!an.control,
  threat:     an => !!an.danger || has(an, ['threat', 'menace', 'legal']),
  crisis:     an => !!an.selfHarm,
  edge:       an => has(an, ['pointed', 'passiveag'])
};
// what the page shows, in the corpus's five words
function levelOf(an, sc, v){
  if(an.danger || an.control || an.selfHarm) return 'very sharp';
  const l = sc.level[0];
  let out;
  if(l === 'heavy') out = 'very sharp';
  else if(l === 'some' && !/little/i.test(sc.level[1])) out = (v && v.mild) ? 'a little sharp' : 'sharp';
  else out = 'clear';
  if(out === 'clear' && (an.warm || has(an, ['appreciation']) || an.apology || has(an, ['repair']))) out = 'kind';
  return out;
}
const PROMISE = /\b(?:i promise|i(?:'ll| will) (?:never|always)|it won't happen again|from now on,? i(?:'ll| will)|i(?:'ll| will) make it up)\b/i;
const low = s => String(s || '').replace(/[’‘]/g, "'").toLowerCase();

const lab = {}; Object.keys(LABELS).forEach(k => lab[k] = {tp: 0, fp: 0, fn: 0, fpList: [], fnList: []});
// concern labels (control, a threat, a crisis): how many messages get one, and how many of those a person wouldn't give one
let concernN = 0, concernFalse = 0, concernWanted = 0, concernHit = 0; const concernFalseList = [];
let lvlN = 0, lvlExact = 0, lvl5 = 0, lvlNear = 0, under = 0, over = 0, keepN = 0, keepOk = 0, promiseBad = 0, gotN = 0, gotOk = 0;
const misses = [];
CORPUS.forEach(c => {
  const ch = WORK.includes(c.rel) ? 'chat' : 'text';
  const an = E.analyze(c.t, {channel: ch, rel: c.rel});
  const sc = E.score(an, ['general'], ch);
  const rw = E.rewrite(an, {wirings: ['general'], channel: ch, rel: c.rel, work: WORK.includes(c.rel)});
  const v = E.verdict(an, sc, rw, {work: WORK.includes(c.rel), rel: c.rel});
  const why = [];
  // level
  const got = levelOf(an, sc, v);
  if(c.lvl !== '*'){
    const want = [].concat(c.lvl);
    lvlN++;
    const gi = LEVELS.indexOf(got), dist = Math.min(...want.map(w => Math.abs(LEVELS.indexOf(w) - gi)));
    // "kind" and "clear" are one band on the page ("likely to land the way you mean it")
    const band = x => Math.max(1, LEVELS.indexOf(x));
    const bandOk = want.some(w => band(w) === band(got));
    if(want.includes(got)) lvl5++;
    if(want.includes(got) || bandOk) lvlExact++; else why.push('level: got "' + got + '", want ' + want.map(w => '"' + w + '"').join(' or '));
    if(dist <= 1) lvlNear++;
    const maxW = Math.max(...want.map(w => band(w))), minW = Math.min(...want.map(w => band(w)));
    if(band(got) < minW) under++;       // read softer than a person would
    if(band(got) > maxW) over++;        // read harsher than a person would
  }
  // labels
  const maybe = new Set(c.maybe || []), want = new Set(c.f || []);
  Object.keys(LABELS).forEach(k => {
    if(maybe.has(k)) return;
    const g = !!LABELS[k](an), w = want.has(k);
    if(g && w) lab[k].tp++;
    else if(g && !w){ lab[k].fp++; lab[k].fpList.push(c.id); why.push('false alarm: ' + k); }
    else if(!g && w){ lab[k].fn++; lab[k].fnList.push(c.id); why.push('missed: ' + k); }
  });
  // the rewrite keeps the ask and adds no promises
  const texts = [rw.main].concat((rw.variants || []).map(x => x.text));
  (c.keep || []).forEach(k => { keepN++; if(low(rw.main).includes(low(k))) keepOk++; else why.push('rewrite lost "' + k + '": ' + rw.main); });
  if(!PROMISE.test(low(c.t))) texts.forEach(x => { if(PROMISE.test(low(x))){ promiseBad++; why.push('rewrite adds a promise: ' + x); } });
  // "Help me read a message I got": the headline agrees with the level
  if(c.lvl !== '*'){
    const r = E.receive(an, {rel: c.rel});
    const head = r.head[0];
    const want2 = [].concat(c.lvl).map(l => (want.has('control') || want.has('threat') || want.has('crisis')) ? ['danger', 'fight'] : l === 'kind' || l === 'clear' ? ['ok'] : l === 'a little sharp' ? ['ok', 'hurt'] : l === 'sharp' ? ['hurt', 'fight'] : ['fight', 'danger', 'hurt']);
    // a threat-shaped line ("I'm going to kill you if you spoil the finale 😂"): "hard to tell" is the honest headline,
    // never "probably fine" (accuracy12: the old "ok" expectation for these was unsafe)
    if(an.harm) want2.push(['unsure']);
    gotN++; if(want2.some(a => a.includes(head))) gotOk++; else why.push('read-mode headline "' + head + '" (' + r.head[1] + ')');
  }
  const concern = !!(an.control || an.danger || an.selfHarm), wantsConcern = ['control', 'threat', 'crisis'].some(k => want.has(k) || maybe.has(k));
  if(concern){ concernN++; if(!wantsConcern){ concernFalse++; concernFalseList.push(c.id); } }
  if(['control', 'threat', 'crisis'].some(k => want.has(k))){ concernWanted++; if(concern || has(an, ['threat', 'legal'])) concernHit++; }
  if(why.length) misses.push({id: c.id, rel: c.rel, t: c.t, got, found: Object.keys(an.found).join(','), why});
});

const pct = (a, b) => b ? Math.round(1000 * a / b) / 10 : 100;
const table = Object.keys(lab).map(k => { const x = lab[k], p = pct(x.tp, x.tp + x.fp), r = pct(x.tp, x.tp + x.fn); return {label: k, tp: x.tp, fp: x.fp, fn: x.fn, precision: p, recall: r, fpList: x.fpList, fnList: x.fnList}; });
const TP = table.reduce((s, x) => s + x.tp, 0), FP = table.reduce((s, x) => s + x.fp, 0), FN = table.reduce((s, x) => s + x.fn, 0);
const summary = {
  messages: CORPUS.length,
  levelScored: lvlN, levelRight: lvlExact, levelPct: pct(lvlExact, lvlN), levelFiveWayPct: pct(lvl5, lvlN), levelWithinOne: pct(lvlNear, lvlN),
  readSofter: under, readHarsher: over,
  labelsMicro: {precision: pct(TP, TP + FP), recall: pct(TP, TP + FN)},
  keepAsk: {n: keepN, ok: keepOk, pct: pct(keepOk, keepN)}, addedPromises: promiseBad,
  readMode: {n: gotN, ok: gotOk, pct: pct(gotOk, gotN)},
  concern: {messages: concernN, falseAlarms: concernFalse, falseList: concernFalseList, wanted: concernWanted, caught: concernHit},
  fullyRight: CORPUS.length - misses.length, fullyRightPct: pct(CORPUS.length - misses.length, CORPUS.length)
};
// regression guard: every message that read fully right when corpus-pass.json was saved must still read right
// (every fixed miss stays fixed). Save with --save-pass after an intended change.
const PASS_FILE = path.join(__dirname, FILE.replace(/\.json$/, '') + '-pass.json');
if(args.includes('--save-pass')){
  require('fs').writeFileSync(PASS_FILE, JSON.stringify(CORPUS.filter(c => !misses.some(m => m.id === c.id)).map(c => c.id)) + '\n');
  console.log('saved ' + (CORPUS.length - misses.length) + ' passing ids to ' + path.basename(PASS_FILE));
}
if(args.includes('--regress')){
  const was = require(PASS_FILE), now = misses.filter(m => was.includes(m.id));
  now.forEach(m => console.log('REGRESSION #' + m.id + ' ' + m.t + '\n    ' + m.why.join('\n    ')));
  console.log(was.length + ' messages that read right before; ' + (was.length - now.length) + ' still right, ' + now.length + ' regressed');
  process.exit(now.length ? 1 : 0);
}
if(JSON_OUT){ console.log(JSON.stringify({summary, labels: table.map(({fpList, fnList, ...x}) => x), misses}, null, 1)); process.exit(0); }
console.log('Text message checker: evaluation on ' + CORPUS.length + ' hand-labelled messages\n');
console.log('How it may land (kind/clear, a little sharp, sharp, very sharp): ' + lvlExact + '/' + lvlN + ' right (' + summary.levelPct + '%), within one step ' + summary.levelWithinOne + '%');
console.log('  with kind and clear told apart (five levels): ' + lvl5 + '/' + lvlN + ' (' + summary.levelFiveWayPct + '%)');
console.log('  read softer than a person would: ' + under + ' · read harsher: ' + over);
console.log('Messages with everything right (level, every label, rewrite, read mode): ' + summary.fullyRight + '/' + CORPUS.length + ' (' + summary.fullyRightPct + '%)');
console.log('Rewrite keeps the ask: ' + keepOk + '/' + keepN + ' · rewrites that add a promise: ' + promiseBad);
console.log('"Read a message I got" headline agrees: ' + gotOk + '/' + gotN + ' (' + summary.readMode.pct + '%)');
console.log('Concern labels (control, threat, crisis): ' + concernN + ' messages, ' + concernFalse + ' a person wouldn\'t give one' + (concernFalseList.length ? ' (#' + concernFalseList.join(', #') + ')' : '') + '; real ones caught: ' + concernHit + '/' + concernWanted + '\n');
console.log('label        TP  FP  FN  precision  recall');
table.forEach(x => console.log(x.label.padEnd(12) + String(x.tp).padStart(3) + String(x.fp).padStart(4) + String(x.fn).padStart(4) + String(x.precision + '%').padStart(11) + String(x.recall + '%').padStart(8)));
console.log('all labels  ' + String(TP).padStart(4) + String(FP).padStart(4) + String(FN).padStart(4) + String(summary.labelsMicro.precision + '%').padStart(11) + String(summary.labelsMicro.recall + '%').padStart(8));
if(!QUIET && misses.length){
  console.log('\nEvery miss (' + misses.length + '):');
  misses.forEach(m => console.log('#' + m.id + ' [' + m.rel + '] ' + m.t + '\n    read as: ' + m.got + ' · found: ' + (m.found || 'nothing') + '\n    ' + m.why.join('\n    ')));
}
