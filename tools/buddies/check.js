#!/usr/bin/env node
/* tools/buddies/check.js — checks every Frequency Buddies episode file (assets/js/buddies/s*e*.js).

   For each episode it checks the data format against the engine's own vocabulary (scenes, actions, speakers,
   guests, moods, weather, music, items, props), flags lines over 140 characters and a few words that don't
   belong in these stories, and estimates the runtime with the player's own calm pacing (the same function the
   player uses: about 13 characters a second, at least 2 seconds a line, a 0.8 second pause after each line and
   a little more after the feeling ones, slow walks, slow scene changes). The runtime must be 13 to 17 minutes.

   Usage: node tools/buddies/check.js [file ...]      (no files: every episode)
   Exit code 1 if anything is wrong. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.resolve(__dirname, '..', '..');
const DIR = path.join(ROOT, 'assets', 'js', 'buddies');

// the engine, loaded without a page (it only defines its vocabulary and the estimate there)
const sandbox = { console };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'assets', 'js', 'buddies-player.js'), 'utf8'), sandbox, { filename: 'buddies-player.js' });
const P = sandbox.TOLBuddiesPlayer;
if (!P || !P.lint || !P.estimate) { console.error('Could not load the engine (assets/js/buddies-player.js)'); process.exit(1); }

// words that don't belong in a Frequency Buddies story (the site's content rules)
const BANNED = /\b(abuse[ds]?|abusive|violen\w*|suicid\w*|self[- ]harm|crisis|hotline|kill\w*|dead|death|dying|die[sd]?|blood\w*|hurt(s|ing)? (?:yourself|herself|himself)|hospital|illness|sick(ness)?|disease|diagnos\w*|therap\w*|cure[sd]?|heal(s|ing|ed)?|streaks?|casino|jackpot|gambl\w*|bet(s|ting)?|collar)\b/i;

const files = process.argv.slice(2).length ? process.argv.slice(2).map(f => path.resolve(f))
  : (fs.existsSync(DIR) ? fs.readdirSync(DIR).filter(f => /^s\d+e\d+\.js$/.test(f)).sort((a, b) => a.localeCompare(b, 'en', { numeric: true })).map(f => path.join(DIR, f)) : []);
if (!files.length) { console.error('No episode files found in ' + path.relative(ROOT, DIR)); process.exit(1); }

let bad = 0, total = 0;
for (const file of files) {
  const box = { console };
  box.window = box; box.globalThis = box;
  vm.createContext(box);
  const rel = path.relative(ROOT, file);
  try { vm.runInContext(fs.readFileSync(file, 'utf8'), box, { filename: rel }); }
  catch (e) { console.log('\n✗ ' + rel + '\n  does not run: ' + e.message); bad++; continue; }
  const eps = box.TOLBuddies && box.TOLBuddies.episodes || {};
  const want = path.basename(file, '.js'), ep = eps[want];
  if (!ep) { console.log('\n✗ ' + rel + '\n  does not define TOLBuddies.episodes[\'' + want + '\']'); bad++; continue; }
  // copy into the engine's realm, so its checks see plain objects
  const epc = vm.runInContext('(' + JSON.stringify(ep) + ')', sandbox);
  const r = P.lint(epc), est = P.estimate(epc), errs = r.errors.slice();
  if (ep.id !== want) errs.push('id is "' + ep.id + '" but the file is ' + want);
  const words = [];
  (ep.chapters || []).forEach((c, ci) => {
    [c.title].concat((c.beats || []).map(b => b.text || b.caption || '')).forEach(t => { const m = String(t || '').match(BANNED); if (m) words.push('chapter ' + (ci + 1) + ': "' + m[0] + '" in "' + String(t).slice(0, 70) + '"'); });
  });
  [ep.title, ep.blurb, ep.lesson, ep.next].forEach(t => { const m = String(t || '').match(BANNED); if (m) words.push('"' + m[0] + '" in "' + String(t).slice(0, 70) + '"'); });
  words.forEach(w => errs.push('content: ' + w));
  const min = est.total / 60, okTime = min >= 13 && min <= 17;
  if (!okTime) errs.push('runtime ' + min.toFixed(1) + ' min is outside 13–17 minutes');
  total += est.total;
  const mark = errs.length ? '✗' : '✓';
  console.log('\n' + mark + ' ' + rel + '  "' + ep.title + '"  (pillar ' + ep.pillar + ')');
  console.log('  runtime ' + min.toFixed(1) + ' min · ' + est.lines + ' lines · ' + est.words + ' words · ' + est.chapters.length + ' chapters');
  est.chapters.forEach((c, i) => console.log('    ' + (i + 1) + '. ' + c.title + '  ' + (c.dur / 60).toFixed(1) + ' min'));
  errs.forEach(e => console.log('  ERROR ' + e));
  r.warnings.forEach(w => console.log('  warning ' + w));
  if (errs.length) bad++;
}
console.log('\n' + files.length + ' episode' + (files.length === 1 ? '' : 's') + ', ' + (total / 60).toFixed(1) + ' minutes in all' + (bad ? ', ' + bad + ' with problems' : ', all good'));
process.exit(bad ? 1 : 0);
