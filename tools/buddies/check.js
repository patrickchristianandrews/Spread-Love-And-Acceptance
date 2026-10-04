#!/usr/bin/env node
/* tools/buddies/check.js — checks every Frequency Buddies episode file (assets/js/buddies/s*e*.js).

   For each episode it checks the data format against the engine's own vocabulary (scenes, actions, speakers,
   guests, moods, weather, music, items, props, the optional 0.5–1.5 `energy` on say beats, and each line's `to`: self, both, all, a pal or a guest on stage), flags lines over 140 characters and a few words that don't
   belong in these stories, and estimates the runtime with the player's own calm pacing (the same function the
   player uses: about 13 characters a second, at least 2 seconds a line, a 0.8 second pause after each line and
   a little more after the feeling ones, slow walks, slow scene changes). The runtime must be 13 to 17 minutes.

   Props: every item and prop in the engine's vocabulary must have a painter in the player (nothing falls through
   silently); every beat may only use the fields the player reads (a typo like `prop:` would be ignored on screen);
   and a line that names a thing ("Look at this map!", "the basket", "the bell") needs that thing in sight at that
   moment: lying on the stage, carried by a pal, or part of the scenery (the player's own scan() decides what is
   in sight). A line that talks about something on purpose out of sight (it's lost, it's at home, it's a plan)
   says so with `offscreen: ['toolbox']`.

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

// a thing named in a line, and what on stage counts as seeing it (see the player's ITEMS, SCENERY and FAMILY)
const SEE = {
  map: [/\bmaps?\b/i, ['map', 'bottle', 'picnic']],
  basket: [/\bbaskets?\b/i, ['basket', 'picnic', 'constellations']],
  toolbox: [/\btoolbox\b/i, ['toolbox']],
  hammer: [/\bhammer\b/i, ['hammer', 'toolbox']],
  plank: [/\bplanks?\b/i, ['plank', 'treehouse', 'bridge']],
  kite: [/\bkites?\b/i, ['kite', 'soggykite', 'flykite', 'skykites', 'constellations']],
  page: [/\bpages?\b/i, ['page', 'pages', 'paperboat']],
  blanket: [/\bblanket\b/i, ['blanket', 'picnic', 'checklist']],
  lantern: [/\blantern\b/i, ['lantern']],
  bone: [/\bbone\b/i, ['bone']],
  drum: [/\bdrum\b/i, ['drum', 'constellations']],
  ukulele: [/\bukulele\b/i, ['ukulele']],
  carousel: [/\bcarousel\b/i, ['carousel']],
  pole: [/\bpoles?\b/i, ['pole', 'carousel']],
  chimney: [/\b(weathervane|chimney)\b/i, ['chimney']],
  pinecone: [/\bpinecones?\b/i, ['pinecones', 'pinecone']],
  stump: [/\bstump\b/i, ['stump']],
  log: [/\blog\b/i, ['log']],
  sign: [/\bsign\b/i, ['sign', 'starsign']],
  bell: [/\bbell\b/i, ['bell']],
  lens: [/\b(magnifying glass|lens)\b/i, ['lens']],
  boat: [/\b(row)?boat\b/i, ['paperboat', 'rowboat']],
  rope: [/\brope\b(?! bridge)/i, ['rope', 'rowboat']], // (the rope bridge comes up in plans and memories; it's only ever crossed where it's drawn)
  stones: [/\bstepping stones?\b/i, ['creek']],
  stick: [/\bstick\b/i, ['stick', 'kite', 'soggykite']]
};
// the fields each kind of beat may have (anything else would be quietly ignored by the player)
const FIELDS = {
  say: ['say', 'to', 'text', 'mood', 'energy', 'hold', 'offscreen'], act: ['act', 'who', 'to', 'dur', 'item', 'target', 'think', 'emoji'],
  scene: ['scene', 'hour', 'weather', 'caption', 'props'], place: ['place', 'props'], guest: ['guest', 'enter', 'exit', 'name'], music: ['music'], wait: ['wait']
};
// a pretend 2D canvas: every drawing call is accepted, so a painter that calls something that isn't a function shows up
function mockCanvas() {
  const grad = { addColorStop() {} };
  const base = { createRadialGradient: () => grad, createLinearGradient: () => grad, measureText: () => ({ width: 10 }), getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }) };
  return new Proxy(base, { get: (o, k) => (k in o ? o[k] : typeof k === 'string' && /^[a-z]/.test(k) && !/^(fillStyle|strokeStyle|lineWidth|lineCap|font|textAlign|textBaseline|globalAlpha|shadowColor|shadowBlur|shadowOffsetY)$/.test(k) ? () => {} : o[k]), set: (o, k, v) => { o[k] = v; return true; } });
}
// words that don't belong in a Frequency Buddies story (the site's content rules)
const BANNED = /\b(abuse[ds]?|abusive|violen\w*|suicid\w*|self[- ]harm|crisis|hotline|kill\w*|dead|death|dying|die[sd]?|blood\w*|hurt(s|ing)? (?:yourself|herself|himself)|hospital|illness|sick(ness)?|disease|diagnos\w*|therap\w*|cure[sd]?|heal(s|ing|ed)?|streaks?|casino|jackpot|gambl\w*|bet(s|ting)?|collar)\b/i;

const ARGS = process.argv.slice(2), NOCLIPS = ARGS.includes('--no-clips'), FILES = ARGS.filter(a => a !== '--no-clips');
// the same key the player uses to find a line's recording
function ckey(who, text) { let h = 0x811c9dc5; const s = who + '|' + text; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return ('0000000' + h.toString(16)).slice(-8); }
const files = FILES.length ? FILES.map(f => path.resolve(f))
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
  // every thing the engine knows has a painter, and it paints without an error (on a pretend canvas), carried and on the ground
  P.vocab.items.forEach(it => {
    if (P.painted.indexOf(it) < 0) { errs.push('the player has no painter for item "' + it + '"'); return; }
    [false, true].forEach(gr => { try { P.paintItem(mockCanvas(), it, gr, { t: 1.5, glow: 'flicker', weather: 'clear', geo: { dark: 0.5 } }); } catch (e) { errs.push('painting ' + it + (gr ? ' on the ground' : ' carried') + ' fails: ' + e.message); } });
  });
  // only fields the player reads
  (ep.chapters || []).forEach((c, ci) => (c.beats || []).forEach((b, bi) => {
    const kind = Object.keys(FIELDS).find(k => k in b && (k !== 'place' || true)) || (b.props != null ? 'place' : null);
    const k2 = 'say' in b ? 'say' : 'act' in b ? 'act' : 'scene' in b ? 'scene' : 'guest' in b ? 'guest' : 'music' in b ? 'music' : 'wait' in b ? 'wait' : ('place' in b || 'props' in b) ? 'place' : kind;
    if (!k2) return;
    Object.keys(b).forEach(f => { if (FIELDS[k2].indexOf(f) < 0) errs.push('chapter ' + (ci + 1) + ' beat ' + (bi + 1) + ': unknown field "' + f + '" on a ' + k2 + ' beat'); });
    if (b.offscreen != null && !(Array.isArray(b.offscreen) && b.offscreen.every(w => SEE[w]))) errs.push('chapter ' + (ci + 1) + ' beat ' + (bi + 1) + ': offscreen should list thing names (' + Object.keys(SEE).join(', ') + ')');
  }));
  // a line that names a thing has it in sight
  P.scan(epc).forEach(l => {
    const text = String(l.b.text || ''), off = l.b.offscreen || [];
    for (const name in SEE) {
      const [re, ok] = SEE[name];
      if (!re.test(text) || off.indexOf(name) >= 0) continue;
      if (!ok.some(x => l.seen.indexOf(x) >= 0)) errs.push('chapter ' + (l.ch + 1) + ' beat ' + (l.beat + 1) + ': "' + text.slice(0, 60) + '" names the ' + name + ', but none is in sight (in sight: ' + (l.seen.join(', ') || 'nothing') + ')');
    }
  });
  if (ep.id !== want) errs.push('id is "' + ep.id + '" but the file is ' + want);
  // optional `energy` on a say beat: how big the delivery is (0.6 very soft … 1.0 normal … 1.4 very big)
  (ep.chapters || []).forEach((c, ci) => (c.beats || []).forEach((b, bi) => {
    if (!('energy' in b)) return;
    const at = 'chapter ' + (ci + 1) + ' beat ' + (bi + 1);
    if (b.say == null) errs.push(at + ': energy is only for say beats');
    else if (typeof b.energy !== 'number' || !isFinite(b.energy) || b.energy < 0.5 || b.energy > 1.5) errs.push(at + ': energy should be a number from 0.5 to 1.5 (got ' + JSON.stringify(b.energy) + ')');
  }));
  // guests: no entering while already on stage, no exiting or speaking while off stage (guests stay on across scenes)
  const onStage = new Set();
  (ep.chapters || []).forEach((c, ci) => (c.beats || []).forEach((b, bi) => {
    const at = 'chapter ' + (ci + 1) + ' beat ' + (bi + 1);
    if (b.guest != null) {
      if (b.exit) { if (!onStage.has(b.guest)) errs.push(at + ': ' + b.guest + ' exits but is not on stage'); onStage.delete(b.guest); }
      else { if (onStage.has(b.guest)) errs.push(at + ': ' + b.guest + ' enters but is already on stage'); onStage.add(b.guest); }
    } else if (b.say != null) {
      if (!['tidbit', 'sugarfoot', 'narrator'].includes(b.say) && !onStage.has(b.say)) errs.push(at + ': ' + b.say + ' speaks but is not on stage');
      // `to`: who the line is spoken to. Every pal and guest line has one; the narrator has none.
      // 'self' (thinking out loud), 'both' (the two pals), 'all' (the whole group), 'tidbit', 'sugarfoot', or a guest on stage now
      if (b.say === 'narrator') { if ('to' in b) errs.push(at + ': narrator lines take no `to`'); }
      else if (!('to' in b)) errs.push(at + ': ' + b.say + ' line has no `to` (self, both, all, tidbit, sugarfoot or a guest on stage)');
      else if (typeof b.to !== 'string' || !(['self', 'both', 'all', 'tidbit', 'sugarfoot'].includes(b.to) || onStage.has(b.to))) errs.push(at + ': to "' + b.to + '" should be self, both, all, tidbit, sugarfoot or a guest on stage now');
      else if (b.to === b.say) errs.push(at + ': ' + b.say + ' is speaking to herself; use to: \'self\'');
    }
  }));
  const words = [];
  (ep.chapters || []).forEach((c, ci) => {
    [c.title].concat((c.beats || []).map(b => b.text || b.caption || '')).forEach(t => { const m = String(t || '').match(BANNED); if (m) words.push('chapter ' + (ci + 1) + ': "' + m[0] + '" in "' + String(t).slice(0, 70) + '"'); });
  });
  [ep.title, ep.blurb, ep.lesson, ep.next].forEach(t => { const m = String(t || '').match(BANNED); if (m) words.push('"' + m[0] + '" in "' + String(t).slice(0, 70) + '"'); });
  words.forEach(w => errs.push('content: ' + w));
  // every spoken line has its recording (assets/audio/buddies/<ep>/<key>.mp3, listed in index.json);
  // skip with --no-clips while a new recording is still being made
  if (!NOCLIPS) {
    const idxF = path.join(ROOT, 'assets/audio/buddies', want, 'index.json');
    let idx = null; try { idx = JSON.parse(fs.readFileSync(idxF, 'utf8')); } catch (e) { errs.push('no recordings index at ' + path.relative(ROOT, idxF)); }
    if (idx) {
      const miss = [];
      (ep.chapters || []).forEach((c, ci) => (c.beats || []).forEach(b => {
        if (!b.say) return; const k = ckey(b.say, b.text);
        if (!idx[k] || !fs.existsSync(path.join(path.dirname(idxF), k + '.mp3'))) miss.push('chapter ' + (ci + 1) + ' ' + b.say + ': "' + String(b.text).slice(0, 50) + '"');
      }));
      if (miss.length) errs.push(miss.length + ' line' + (miss.length === 1 ? ' has' : 's have') + ' no recording: ' + miss.slice(0, 4).join('; ') + (miss.length > 4 ? '; …' : ''));
    }
  }
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
