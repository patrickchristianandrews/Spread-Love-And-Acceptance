#!/usr/bin/env node
/* tools/collab/test-collab.js — checks for assets/js/collab.js ("Work on this together").
   Run: node tools/collab/test-collab.js   (exits 1 on any failure)

   - pack / unpack round-trips for every tool's state shape (the small deflater, and the browser-style
     CompressionStream one), and the deflater / inflater against zlib
   - merge rules: two and three people, repeated rounds, conflicting edits, an older link opened after a newer one
   - size limits: the long-link line, the inflate cap (a "zip bomb" link), the packed-length cap
   - malformed and hostile input: never throws out of read(), never pollutes prototypes, strips control and
     direction characters; HTML in names stays plain text (the page only ever sets textContent)
   - old-format links (#q=, #list=, #letter=, #side=, #room=, #deal=, #plan=, ?compare=) are left alone by
     read(), so each tool's own reader still opens them */
'use strict';
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');
const C = require(path.join(__dirname, '..', '..', 'assets', 'js', 'collab.js'));

let pass = 0, fail = 0;
function ok(cond, name) { if (cond) pass++; else { fail++; console.log('FAIL:', name); } }
function eq(a, b, name) { ok(JSON.stringify(a) === JSON.stringify(b), name + (JSON.stringify(a) === JSON.stringify(b) ? '' : '\n   got  ' + JSON.stringify(a).slice(0, 300) + '\n   want ' + JSON.stringify(b).slice(0, 300))); }
function throws(fn, name) { try { fn(); ok(false, name + ' (did not throw)'); } catch (e) { ok(true, name); } }

// ------------------------------------------------------------------ deflate / inflate against zlib
(function () {
  let bad = 0;
  const words = ['the ', 'owner ', 'dishes ', 'Alex ', 'Sam ', '{"a":', '"b"', ',', '12', 'ñandú ', '😀 ', 'Quiet hours '];
  for (let i = 0; i < 300; i++) {
    const n = Math.floor(Math.random() * (i % 10 === 0 ? 60000 : 4000));
    let buf;
    if (i % 4 === 0) buf = crypto.randomBytes(n);
    else { let s = ''; while (s.length < n) s += words[Math.floor(Math.random() * words.length)]; buf = Buffer.from(s); }
    const d = C.deflateRaw(new Uint8Array(buf));
    if (!zlib.inflateRawSync(Buffer.from(d)).equals(buf)) bad++;
    for (const level of [0, 1, 6, 9]) {
      const z = zlib.deflateRawSync(buf, { level });
      if (!Buffer.from(C.inflateRaw(new Uint8Array(z), 1 << 22)).equals(buf)) bad++;
    }
  }
  ok(bad === 0, 'deflate/inflate agree with zlib on 300 random inputs (' + bad + ' mismatches)');
  // empty input
  eq(Array.from(C.inflateRaw(C.deflateRaw(new Uint8Array(0)))), [], 'empty input round-trips');
})();

// ------------------------------------------------------------------ base64url
(function () {
  for (let n = 0; n < 40; n++) {
    const b = crypto.randomBytes(n);
    const e = C.b64e(new Uint8Array(b));
    ok(e === b.toString('base64url'), 'b64e matches Buffer base64url (' + n + ' bytes)');
    ok(Buffer.from(C.b64d(e)).equals(b), 'b64d round-trips (' + n + ' bytes)');
  }
  throws(() => C.b64d('abc$'), 'b64d rejects a bad character');
  throws(() => C.b64d('a'), 'b64d rejects an impossible length');
})();

// ------------------------------------------------------------------ every tool's state shape
const ALEX = 'p1alex01', SAM = 'p2sam002', KIM = 'p3kim003';
const SHAPES = {
  checkin: { well: 'We cooked together on Tuesday.', heavy: 'The bins, again.', try: 'One owner for the bins.', next: 'Sunday after dinner', jobs: ['Trash and recycling', 'Laundry'] },
  'family-plan': { names: 'Amy, Mum and Dad', visits: 'Sunday lunch every other week, 12 to 3.', advice: 'Ask first: “Do you want ideas, or just to talk?”', baby: 'Nap at 1.', job: 'Grandma does Tuesday pickup.', review: 'First Sunday of next month' },
  room: { quiet: 'Weeknights 11pm to 7am.', guests: 'Fine with a text first.', over: 'Up to 2 nights a week.', clean: 'Sundays.', borrow: 'Ask first.', lights: 'Lamp after 11:30.', raise: 'Text first, then talk.' },
  'time-deal': { games: 'Two weeknights and Saturday afternoon', heads: 'Ten minutes’ warning', ask: 'Pause at the next save point', eve: 'Friday', phone: 'Dinner', chores: 'Dishes first' },
  'our-week': { hours: 'Nights Mon–Wed, 7 pm to 7:30 am', sleep: '9 am to 4 pm', over: '7:30 to 8:30 am', together: 'Thursday breakfast', check: 'Two minutes at the door', jobs: 'Deliveries: Sam' }
};
const OWN_X = {
  'lemonade-quick': { v: 1, p: ['Alex', 'Sam'], l: ['dishes', 'laundry', 'c:Feed the cat'], a: { 0: '01b' }, f: 0, t: 1, o: 0, w: 'day|week:2|' },
  'lemonade-side': { app: 'lemonade', v: 2, by: 'Alex', people: ['Alex', 'Sam'], jobs: [{ n: 'Dishes', f: 'day', v: [20, 0] }], bills: [] },
  workpaper: { t: 'tol-list', v: 1, wp: 'WP-03', p: ['Noor', 'Sami'], m: { reviewDate: '2026-10-14' }, tb: { treaty: [{ task: 'Bins', freq: 'Weekly', r: 'Noor' }, { task: 'Laundry', r: '*' }] } },
  letter: { t: 'tol-letter', v: 1, c: 'abcdefghij', i: 'klmnopqrst', n: 1, at: '2026-10-14T09:00:00.000Z', rel: 'partner', k: 'raise', fn: 'Alex', tn: 'Sam', h: 'When the bins were left', f: 'tired', a: 'Could we pick one owner?' }
};
(function () {
  Object.keys(SHAPES).forEach(function (tool) {
    const env = C.envelope({ tool, id: ALEX, name: 'Alex', d: SHAPES[tool], at: 1760000000, r: 'round1' });
    const p = C.packSync(env), back = C.clean(C.unpackSync(p));
    eq(back.p[ALEX].d, SHAPES[tool], 'round-trip (small deflater): ' + tool);
    eq(back.t, tool, 'tool id kept: ' + tool);
    const url = C.link(env, '/x.html'), r = C.read(url);
    eq(r && r.p[ALEX].d, SHAPES[tool], 'link → read(): ' + tool);
    ok(/^https:\/\/spreadloveandacceptance\.com\/x\.html#together=[12]\.[A-Za-z0-9_-]+$/.test(url), 'link format: ' + tool);
    eq(C.read(C.code(env)).p[ALEX].d, SHAPES[tool], 'code → read(): ' + tool);
    eq(C.read('Here you go:\n' + url + '\nthanks').p[ALEX].d, SHAPES[tool], 'a link inside a message: ' + tool);
  });
  Object.keys(OWN_X).forEach(function (tool) {
    const env = C.envelope({ tool, id: ALEX, name: 'Alex', d: {}, x: OWN_X[tool], at: 1760000000 });
    eq(C.read(C.link(env, '/y.html')).x, OWN_X[tool], 'a tool’s own data round-trips: ' + tool);
  });
  // wavelength: a code in the person's part
  const wl = C.envelope({ tool: 'wavelength', id: SAM, name: 'Priya', d: { c: 'SFNA', rel: 'friends' } });
  eq(C.read(C.link(wl, '/wavelength.html')).p[SAM].d, { c: 'SFNA', rel: 'friends' }, 'round-trip: wavelength');
})();

// flow17: "2." links (raw deflate with the preset dictionary): shorter, and "1." links still open
(function () {
  const env = C.envelope({ tool: 'lemonade-quick', id: ALEX, name: 'Jen', d: {}, x: { v: 1, p: ['Jen', 'Tom'], l: ['dishes', 'laundry', 'bathroom', 'cooking', 'groceries', 'bills', 'appts', 'petfeed', 'walks', 'lowstock', 'planweek', 'dates', 'bedtime', 'school', 'kidstuff'], a: { 0: '0b10b100b10bb11' }, f: 0, t: 1, k: 1, o: 0 }, at: 1792503151, r: 'wpduxh' });
  const p2 = C.packSync(env);
  ok(/^2\./.test(p2), 'a typical quick look packs as a "2." link');
  const raw = Buffer.from(JSON.stringify(env)), p1 = '1.' + C.b64e(C.deflateRaw(new Uint8Array(raw)));
  ok(p2.length < p1.length * 0.7, '"2." is at least 30% shorter than "1." (' + p2.length + ' vs ' + p1.length + ')');
  eq(C.clean(C.unpackSync(p1)).x, env.x, 'an old "1." link still reads');
  eq(C.clean(C.unpackSync(p2)).x, env.x, 'a "2." link reads');
  eq(C.read('#together=' + p2).x, env.x, 'read() takes a "2." link');
  ok(C.has('x #together=' + p2), 'has() spots a "2." link');
  eq(C.read(C.code(env)).x, env.x, 'a "2." code reads');
  // the dictionary on both ends, and zlib's own preset-dictionary deflate reads with the small inflater
  for (let i = 0; i < 200; i++) {
    const t = Buffer.from(JSON.stringify({ v: 1, t: 'checkin', r: 'abcdef', p: { a: { n: 'Sam' + i, at: i, d: { well: 'x'.repeat(i % 50) + ' dishes laundry' } } } }));
    const d2 = C.deflateRaw(new Uint8Array(t), Buffer.from(C.DICT2_TEXT || ''));
    if (C.DICT2_TEXT) eq(Buffer.from(C.inflateRaw(d2, 1 << 20, Buffer.from(C.DICT2_TEXT))).toString(), t.toString(), 'dictionary round-trip ' + i);
  }
  if (C.DICT2_TEXT) {
    const z = zlib.deflateRawSync(raw, { dictionary: Buffer.from(C.DICT2_TEXT) });
    eq(Buffer.from(C.inflateRaw(new Uint8Array(z), 1 << 20, Buffer.from(C.DICT2_TEXT))).toString(), raw.toString(), 'zlib with the same dictionary reads back');
  }
  // a "1." body labelled "2." still reads the same (it never points back into the dictionary)
  eq((C.read('#together=2.' + C.b64e(C.deflateRaw(new Uint8Array(raw)))) || {}).x, env.x, 'a "1." body labelled "2." reads the same');
  // and a "2." body labelled "1." never reads as something else: it refers back past its start, so it is refused
  ok(C.read('#together=1.' + p2.slice(2)) === null, 'a "2." body labelled "1." is refused');
})();

// the browser-style deflate (CompressionStream) reads back with the small inflater
const asyncChecks = [];
asyncChecks.push((async function () {
  if (typeof CompressionStream !== 'function') { console.log('(skipped: no CompressionStream in this Node)'); return; }
  for (const tool of Object.keys(SHAPES)) {
    const env = C.envelope({ tool, id: ALEX, name: 'Alex', d: SHAPES[tool] });
    const p = await C.pack(env);
    ok(p.length <= C.packSync(env).length, 'pack() is never longer than packSync(): ' + tool);
    eq((await C.unpack(p)).p[ALEX].d, SHAPES[tool], 'round-trip (CompressionStream): ' + tool);
  }
  // a long text: CompressionStream's dynamic codes squeeze better, and it still reads back
  const big = { notes: 'Dishes and laundry and the bins. '.repeat(200) };
  const env = C.envelope({ tool: 'checkin', id: ALEX, d: big });
  const p = await C.pack(env);
  eq((await C.unpack(p)).p[ALEX].d, big, 'round-trip of a long text (CompressionStream)');
  ok(p.length < JSON.stringify(env).length / 4, 'a repetitive text squeezes well');
})());

// ------------------------------------------------------------------ merging
(function () {
  const t0 = 1760000000;
  const a1 = C.envelope({ tool: 'checkin', id: ALEX, name: 'Alex', d: { well: 'Cooking', heavy: '' }, at: t0, r: 'roundx' });
  // B opens A's link
  let m = C.merge(null, a1);
  eq(m.changes.map(c => [c.id, c.kind]), [[ALEX, 'new']], 'first link: Alex is new');
  // B adds their part and sends it back (A's part rides along, untouched)
  const b1 = C.envelope({ tool: 'checkin', id: SAM, name: 'Sam', d: { well: 'The walk', heavy: 'Bins' }, at: t0 + 60, base: m.env, r: m.env.r });
  eq(Object.keys(b1.p).sort(), [ALEX, SAM].sort(), 'the reply carries both parts');
  eq(b1.r, 'roundx', 'the reply keeps the round id');
  // A opens it: A's own part is the same, Sam's is new
  m = C.merge(a1, b1);
  eq(m.env.p[ALEX].d, a1.p[ALEX].d, 'Alex’s part is not overwritten by the copy that came back');
  eq(m.env.p[SAM].d, { well: 'The walk', heavy: 'Bins' }, 'Sam’s part is merged in');
  eq(m.changes.filter(c => c.id === SAM).map(c => c.kind), ['new'], 'Sam is new to Alex');
  // repeated rounds: Sam changes one answer
  const b2 = C.envelope({ tool: 'checkin', id: SAM, name: 'Sam', d: { well: 'The walk', heavy: 'Bins, and the car' }, at: t0 + 3600, base: m.env, r: m.env.r });
  const m2 = C.merge(m.env, b2);
  const sc = m2.changes.filter(c => c.id === SAM)[0];
  eq([sc.kind, sc.keys], ['updated', ['heavy']], 'round 2: Sam changed only “heavy”');
  eq(m2.env.p[SAM].d.heavy, 'Bins, and the car', 'round 2: the newer part wins');
  // an older link opened after the newer one changes nothing, and says so
  const m3 = C.merge(m2.env, b1);
  eq(m3.env.p[SAM].d.heavy, 'Bins, and the car', 'older link: the newer part stays');
  ok(m3.older === true, 'older link: flagged as older');
  eq(m3.changes.filter(c => c.id === SAM).map(c => c.kind), ['older'], 'older link: Sam’s change is “older”');
  // the same link twice: nothing new
  const m4 = C.merge(m2.env, b2);
  eq(m4.changes.filter(c => c.id === SAM).map(c => c.kind), ['same'], 'the same link twice: nothing new');
  // conflicting edits: Alex and Sam both write "heavy" differently: both kept, in their own parts
  const a2 = C.envelope({ tool: 'checkin', id: ALEX, name: 'Alex', d: { well: 'Cooking', heavy: 'Money' }, at: t0 + 3700, base: m2.env, r: 'roundx' });
  const m5 = C.merge(m2.env, a2);
  eq([m5.env.p[ALEX].d.heavy, m5.env.p[SAM].d.heavy], ['Money', 'Bins, and the car'], 'conflicting answers live side by side, nobody overwritten');
  // three people: Kim joins from Sam's link; Alex gets Kim's and keeps Sam's newest
  const k1 = C.envelope({ tool: 'checkin', id: KIM, name: 'Kim', d: { well: 'Movie night' }, at: t0 + 4000, base: b1, r: 'roundx' });
  ok(Object.keys(k1.p).length === 3, 'three people: Kim’s link carries three parts');
  const m6 = C.merge(m5.env, k1);
  eq(Object.keys(m6.env.p).sort(), [ALEX, KIM, SAM].sort(), 'three people: everyone has a part');
  eq(m6.env.p[SAM].d.heavy, 'Bins, and the car', 'three people: Kim’s older copy of Sam’s part doesn’t win');
  eq(m6.env.p[ALEX].d.heavy, 'Money', 'three people: Kim’s older copy of Alex’s part doesn’t win');
  eq(m6.changes.filter(c => c.id === KIM).map(c => c.kind), ['new'], 'three people: Kim is new');
  // merging the other way round gives the same parts (order doesn't matter)
  const ma = C.merge(C.merge(m5.env, k1).env, b2).env, mb = C.merge(C.merge(m5.env, b2).env, k1).env;
  eq(ma.p, mb.p, 'merging is order-independent');
  // a link for another tool is never merged into this one
  const other = C.envelope({ tool: 'room', id: SAM, d: { quiet: 'x' } });
  const mo = C.merge(m6.env, other);
  eq(Object.keys(mo.env.p), [SAM], 'a different tool starts fresh (no mixing)');
  // a tool's own shared data: the newer link's
  const x1 = C.envelope({ tool: 'workpaper', id: ALEX, d: {}, x: { v: 1 }, at: t0 }), x2 = C.envelope({ tool: 'workpaper', id: SAM, d: {}, x: { v: 2 }, at: t0 + 5 });
  eq(C.merge(C.merge(null, x1).env, x2).env.x, { v: 2 }, 'own data: newer wins');
  eq(C.merge(C.merge(null, x2).env, x1).env.x, { v: 2 }, 'own data: older doesn’t replace newer');
  // changedKeys
  eq(C.changedKeys({ a: 1, b: [1, 2] }, { a: 1, b: [1, 3], c: '' }), ['b', 'c'], 'changedKeys finds changed and added answers');
  // at most 12 people
  let big = null;
  for (let i = 0; i < 20; i++) big = C.merge(big && big.env, C.envelope({ tool: 'checkin', id: 'pp' + String(i).padStart(4, '0'), d: { well: String(i) }, at: t0 + i }));
  ok(Object.keys(big.env.p).length === 12, 'no more than 12 people in one round');
})();

// ------------------------------------------------------------------ sizes
(function () {
  ok(!C.isLong('https://spreadloveandacceptance.com/x#together=1.' + 'a'.repeat(1700)), 'under 1,800 characters: fine for QR and texts');
  ok(C.isLong('https://spreadloveandacceptance.com/x#together=1.' + 'a'.repeat(1800)), 'over 1,800 characters: long');
  // a realistic long one: a 60-job list with notes
  const rows = []; for (let i = 0; i < 60; i++) rows.push({ task: 'Job number ' + i + ' ' + crypto.randomBytes(6).toString('hex'), r: i % 2 ? 'Noor' : 'Sami', notes: crypto.randomBytes(10).toString('hex') });
  const env = C.envelope({ tool: 'workpaper', id: ALEX, d: {}, x: { t: 'tol-list', v: 1, wp: 'WP-03', p: ['Noor', 'Sami'], m: {}, tb: { treaty: rows } } });
  const url = C.link(env, '/workpapers/fill/wp-03.html');
  ok(C.isLong(url), 'a 60-job list with notes is a long link (' + url.length + ' characters)');
  eq(C.read(C.codeOf(url)).x.tb.treaty.length, 60, 'the code form of a long link reads back whole');
  // a "zip bomb": 5 MB of zeros squeezes to a few KB, and the inflater stops at 256 KB
  const bomb = zlib.deflateRawSync(Buffer.alloc(5 * 1024 * 1024, 32), { level: 9 });
  const packed = '1.' + Buffer.from(bomb).toString('base64url');
  ok(packed.length < 20000, 'the bomb is small (' + packed.length + ' characters)');
  throws(() => C.unpackSync(packed), 'the inflater refuses to blow up past 256 KB');
  ok(C.read('#together=' + packed) === null, 'read() returns null for the bomb');
  // too long to even try
  ok(C.read('#together=1.' + 'A'.repeat(70000)) === null, 'a packed text past 60,000 characters is refused');
})();

// ------------------------------------------------------------------ malformed and hostile input
(function () {
  const junk = ['', '#together=', '#together=1.', '#together=2.abc', '#together=1.@@@', '#together=1.AAAA', 'TOL-TOGETHER:', 'TOL-TOGETHER:1.zzzz',
    null, undefined, 42, {}, [], '#together=1.' + Buffer.from('not deflate at all').toString('base64url')];
  junk.forEach((j, i) => { let r; try { r = C.read(j); ok(r === null, 'junk ' + i + ' reads as null'); } catch (e) { ok(false, 'junk ' + i + ' threw: ' + e.message); } });
  // random bytes, many times
  let threw = 0;
  for (let i = 0; i < 2000; i++) { try { C.read('#together=1.' + crypto.randomBytes(1 + (i % 300)).toString('base64url')); } catch (e) { threw++; } }
  ok(threw === 0, 'read() never throws on 2,000 random links');
  // truncated real links
  const env = C.envelope({ tool: 'checkin', id: ALEX, name: 'Alex', d: SHAPES.checkin });
  const url = C.link(env, '/check-ins.html');
  let bad = 0;
  for (let cut = 1; cut < 60; cut++) { try { const r = C.read(url.slice(0, url.length - cut)); if (r && JSON.stringify(r.p[ALEX].d) === JSON.stringify(SHAPES.checkin)) bad++; } catch (e) { bad++; } }
  ok(bad === 0, 'a cut-off link never throws, and never reads as the whole thing');
  function packRaw(o) { return '#together=' + C.packSync(o); }
  // wrong shapes
  ok(C.read(packRaw({ v: 2, t: 'checkin', p: {} })) === null, 'wrong version refused');
  ok(C.read(packRaw({ v: 1, t: '<script>', p: {} })) === null, 'a bad tool id refused');
  ok(C.read(packRaw([1, 2, 3])) === null, 'an array refused');
  ok(C.read(packRaw('text')) === null, 'a string refused');
  // prototype pollution
  const evil = JSON.parse('{"v":1,"t":"checkin","r":"abcdef","p":{"__proto__":{"n":"x","d":{"polluted":1}},"pevil001":{"n":"Eve","at":1,"d":{"__proto__":{"polluted":1},"constructor":{"prototype":{"polluted":1}},"ok":"fine"}}},"x":{"__proto__":{"polluted":1}}}');
  const r = C.read(packRaw(evil));
  ok(r && ({}).polluted === undefined && Object.prototype.polluted === undefined, 'no prototype pollution');
  eq(r && Object.keys(r.p), ['pevil001'], 'a "__proto__" person id is dropped');
  eq(r && r.p.pevil001.d, { ok: 'fine' }, '"__proto__" and "constructor" keys are dropped');
  ok(r && Object.getPrototypeOf(r.p.pevil001.d) === Object.prototype, 'parts are plain objects');
  const sneaky = C.read(packRaw({ v: 1, t: 'checkin', p: { psnk0001: { n: 'S', at: 1, d: { '__pro\u0000to__': { polluted: 1 }, 'con\u200Bstructor': 1, fine: 1 } } } }));
  ok(sneaky && Object.getPrototypeOf(sneaky.p.psnk0001.d) === Object.prototype && Object.keys(sneaky.p.psnk0001.d).join() === 'fine', 'a "__proto__" hidden with invisible characters is dropped too');
  // names: control and direction characters stripped, length capped; HTML stays as text
  const nasty = C.envelope({ tool: 'checkin', id: ALEX, name: 'x', d: { well: '<img src=x onerror=alert(1)>' } });
  nasty.p[ALEX].n = '‮evil\u0007 <b>Name</b> ' + 'z'.repeat(100);
  const rn = C.read(packRaw(nasty));
  ok(rn.p[ALEX].n.indexOf('‮') < 0 && rn.p[ALEX].n.indexOf('\u0007') < 0, 'direction and control characters stripped from names');
  ok(rn.p[ALEX].n.length <= 40, 'names capped at 40 characters');
  eq(rn.p[ALEX].d.well, '<img src=x onerror=alert(1)>', 'HTML in an answer arrives as plain text (the page sets textContent)');
  // deep nesting and huge arrays are cut down, not crashed on
  let deep = { a: 1 }; for (let i = 0; i < 50; i++) deep = { n: deep };
  const dn = C.read(packRaw({ v: 1, t: 'checkin', p: { pdeep001: { n: 'D', at: 1, d: { deep, arr: new Array(5000).fill('x'), s: 'y'.repeat(10000) } } } }));
  ok(dn && dn.p.pdeep001.d.arr.length === 500, 'arrays capped at 500 items');
  ok(dn && dn.p.pdeep001.d.s.length === 4000, 'strings capped at 4,000 characters');
  let depth = 0, n = dn && dn.p.pdeep001.d.deep; while (n && typeof n === 'object') { depth++; n = n.n; }
  ok(depth <= 9, 'nesting capped (' + depth + ' levels)');
  // numbers: NaN / Infinity / negative times made safe
  const nn = C.read(packRaw({ v: 1, t: 'checkin', at: -5, p: { pnum0001: { n: 'N', at: 'soon', d: { x: 1e400 } } } }));
  ok(nn && nn.p.pnum0001.at === 0 && nn.p.pnum0001.d.x === null, 'bad numbers become 0 / null');
  // too many people in one link: 12 kept
  const many = { v: 1, t: 'checkin', p: {} }; for (let i = 0; i < 40; i++) many.p['pm' + String(i).padStart(4, '0')] = { n: 'P' + i, at: i, d: {} };
  ok(Object.keys(C.read(packRaw(many)).p).length === 12, 'at most 12 people read from a link');
})();

// ------------------------------------------------------------------ old links are left to their tools
(function () {
  const old = [
    'https://spreadloveandacceptance.com/lemonade-stand.html#q=eyJ2IjoxLCJwIjpbIkFsZXgiLCJTYW0iXX0',
    'https://spreadloveandacceptance.com/lemonade-stand.html#side=jeyJhcHAiOiJsZW1vbmFkZSJ9',
    'https://spreadloveandacceptance.com/workpapers/fill/wp-03.html#list=eyJ0IjoidG9sLWxpc3QifQ',
    'TOLLIST1:eyJ0IjoidG9sLWxpc3QifQ',
    'https://spreadloveandacceptance.com/write-it-through.html#letter=eyJ0IjoidG9sLWxldHRlciJ9',
    'https://spreadloveandacceptance.com/sharing-a-room.html#room=eyJyYS1tZSI6IkFsZXgifQ',
    'https://spreadloveandacceptance.com/gaming-and-time-together.html#deal=eyJ0ZC1uMSI6IkFsZXgifQ',
    'https://spreadloveandacceptance.com/check-ins.html?for=family#plan=eyJ2aXNpdHMiOiJTdW5kYXkifQ',
    'https://spreadloveandacceptance.com/wavelength.html?compare=SFNA&from=Priya'
  ];
  old.forEach(u => { ok(C.read(u) === null && !C.has(u), 'an old link is left to its tool: ' + u.replace(/^https:\/\/spreadloveandacceptance\.com/, '').slice(0, 40)); });
  // and the new links are recognised
  ok(C.has('x #together=1.abc'), 'has() spots a together link');
  ok(C.has('TOL-TOGETHER:1.abc'), 'has() spots a together code');
})();


// ------------------------------------------------------------------ joining: side by side, scores, merged lists
(function () {
  const F = C.combine.fields, S = C.combine.score, L = C.combine.list;
  const two = [{ id: 'a', n: 'Alex', me: true, d: { w: ['Hugs', 'Notes'], t: 'Tea', x: '' } }, { id: 'b', n: 'Sam', d: { w: ['notes ', 'Walks'], t: ' tea', y: 'Only Sam' } }];
  const f2 = F(two, []);
  eq([f2.same, f2.differ], [1, 1], 'two people: one answer the same, one different');
  eq(f2.rows.filter(r => r.k === 'w')[0].common, ['Notes'], 'two people: the choices both made are found (case and spaces don’t matter)');
  ok(f2.rows.filter(r => r.k === 'y')[0].missing, 'one person missing an answer: marked, not counted as a difference');
  ok(!f2.rows.some(r => r.k === 'x'), 'an answer nobody filled in is left out');
  const three = two.concat([{ id: 'k', n: 'Kim', d: { w: ['Notes'], t: 'Coffee' } }]);
  const f3 = F(three, [{ k: 'w' }, { k: 't' }]);
  eq(f3.rows.map(r => [r.k, r.same]), [['w', false], ['t', false]], 'three people: compared across everyone');
  eq(f3.rows[0].common, ['Notes'], 'three people: what all three chose');
  const s2 = S([{ id: 'a', n: 'Alex', me: true, d: { s: 0.62 } }, { id: 'b', n: 'Sam', d: { s: 0.30 } }]);
  eq([s2.gap, s2.close, s2.high && s2.high.n], [0.32, false, 'Alex'], 'scores: the gap, and whose reads higher');
  ok(!/win|lose|better|worse/i.test(C.combine.gapWords(s2)), 'scores: the words name no winner');
  ok(/isn’t a contest/.test(C.combine.gapWords(s2)), 'scores: the words say it isn’t a contest');
  const s3 = S([{ n: 'A', d: { s: 0.5 } }, { n: 'B', d: { s: 0.55 } }, { n: 'C', d: {} }]);
  eq([s3.gap, s3.close], [0.05, true], 'scores: three people, one missing, the others close');
  ok(S([{ n: 'A', d: { s: 0.5 } }]).gap === null, 'scores: one score alone has no gap');
  const l = L([{ n: 'Alex', d: { items: ['Morning coffee', { t: 'Sunday walk', x: 'fading' }] } }, { n: 'Sam', d: { items: ['morning  coffee', 'Movie night'] } }, { n: 'Kim', d: {} }]);
  eq(l.items.map(i => [i.text, i.by]), [['Morning coffee', ['Alex', 'Sam']], ['Sunday walk', ['Alex']], ['Movie night', ['Sam']]], 'lists: merged, duplicates joined, who added what (a person with no list is fine)');
  eq(l.shared, 1, 'lists: one item on more than one list');
  eq(l.items[1].extra, [{ n: 'Alex', x: 'fading' }], 'lists: a note on an item is kept with who wrote it');
})();

// ------------------------------------------------------------------ "Share my results": the bundle
(function () {
  const R = require(path.join(__dirname, '..', '..', 'assets', 'js', 'collab-results.js'));
  function store(ls, ss) { return { ls: k => (k in ls ? ls[k] : null), ss: k => (k in ss ? ss[k] : null) }; }
  const wp02 = { format: 'x', state: { values: { name: 'Alex', 'factors.sleep': '3', 'factors.work': '3', 'factors.conflict': '2', 'factors.physical': '2', 'factors.time': '3' }, tables: {} } };
  const A = store({
    'tol-weather-v1': JSON.stringify([{ d: '2026-10-14', sky: 'fog', load: 3, sleep: 1 }]),
    'tol-letters': JSON.stringify({ cur: 'c1', convos: { c1: { turns: [{ who: 'me', f: 'The bins.', a: 'One owner?' }] } } }),
    'tol-wpf-keep:WP-15': JSON.stringify({ state: { values: {}, tables: { rituals: [{ ritual: 'Morning coffee', state: 'Alive' }, { ritual: '' }] } } }),
    'tol-wpf-keep:WP-03': JSON.stringify({ state: { values: { partnerA: 'Noor', partnerB: 'Sami' }, tables: { treaty: [{ task: 'Bins', r: 'A' }, { task: 'Dishes & kitchen reset', freq: 'Daily' }, { task: 'Laundry', r: 'Both' }] } } })
  }, {
    'tol-wavelength-tab-v1': JSON.stringify({ answers: { pace: ['a', 'a', 'b'], lens: ['b', 'b', 'b'], send: ['a', 'a', 'a'], recv: ['b', 'a', 'b'] }, chips: [] }),
    'tol-collab-results': JSON.stringify({ care: { w: ['A handwritten note'], t: ['A walk together'] }, touch: { items: ['Our song'] } }),
    'tol-wpf-tab:WP-02': JSON.stringify(wp02)
  });
  const av = R.available(A), ids = av.map(a => a.id);
  ['wavelength', 'care', 'rituals', 'load', 'weather', 'letter', 'wp-03', 'wp-15'].forEach(id => ok(ids.indexOf(id) >= 0, 'bundle: found on this device: ' + id));
  eq(av.filter(a => a.private).map(a => a.id).sort(), ['letter', 'weather'], 'bundle: today’s weather and the message are marked private');
  eq(av.filter(a => a.id === 'wavelength')[0].data, { c: 'QTDA' }, 'bundle: the Wave Code from finished answers');
  eq(av.filter(a => a.id === 'load')[0].data, { s: 0.65 }, 'bundle: the load score from this tab’s WP-02');
  eq(av.filter(a => a.id === 'rituals')[0].data.items.map(i => i.t), ['Morning coffee', 'Our song'], 'bundle: rituals from WP-15 and the touchstone list');
  eq(av.filter(a => a.id === 'wp-03')[0].data.items, [{ t: 'Bins', x: 'Noor' }, { t: 'Laundry', x: 'shared' }], 'bundle: WP-03 jobs with an owner (an untouched starter job stays home)');
  eq(Object.keys(R.build(A, []).items), [], 'bundle: nothing goes in by default');
  eq(Object.keys(R.build(A, ['care', 'load']).items).sort(), ['care', 'load'], 'bundle: only the chosen subset goes in');
  ok(!('weather' in R.build(A, ['care', 'wavelength', 'load']).items) && !('letter' in R.build(A, ['care']).items), 'bundle: private items stay out unless picked');
  ok('weather' in R.build(A, ['weather']).items, 'bundle: a private item goes only when picked by name');
  ok(!('nonsense' in R.build(A, ['nonsense', 'care']).items), 'bundle: an unknown id is ignored');
  // joining bundles: two and three people, a missing section, a newer version, something unknown
  const envA = C.envelope({ tool: 'bundle', id: 'palex001', name: 'Alex', d: R.build(A, ['care', 'load', 'wavelength']), at: 1760000000, r: 'bund01' });
  const sam = { v: 1, items: { care: { v: 1, d: { w: ['A handwritten note', 'Hearing “I’m proud of you”'] } }, wavelength: { v: 1, d: { c: 'SFNA' } } } };
  const envB = C.envelope({ tool: 'bundle', id: 'psam0002', name: 'Sam', d: sam, at: 1760000100, base: envA, r: envA.r });
  const linkB = C.read(C.link(envB, '/together.html'));
  const it2 = R.items(linkB, 'palex001');
  eq(Object.keys(it2.byItem).sort(), ['care', 'load', 'wavelength'], 'bundle: two people, every result listed');
  eq(it2.byItem.care.map(x => [x.n, !!x.me]), [['Alex', true], ['Sam', false]], 'bundle: two people, each one’s part, yours marked');
  eq(it2.byItem.load.map(x => x.n), ['Alex'], 'bundle: one person missing a section (Sam sent no load)');
  const kim = { v: 1, items: { care: { v: 7, d: { w: ['A long hug'] } }, futurething: { v: 1, d: { a: 1 } } } };
  const envK = C.envelope({ tool: 'bundle', id: 'pkim0003', name: 'Kim', d: kim, at: 1760000200, base: linkB, r: envA.r });
  const it3 = R.items(C.read(C.link(envK, '/together.html')), 'psam0002');
  eq(it3.byItem.care.map(x => x.n), ['Alex', 'Sam', 'Kim'], 'bundle: three people, in the order they sent');
  eq(it3.newer, ['care'], 'bundle: a part from a newer version is flagged, and still shown');
  eq(it3.unknown, ['futurething'], 'bundle: something this version doesn’t know is set aside');
  // the side-by-side data for a Wave Code reads letter by letter
  eq(R.shaped('wavelength', { c: 'QTDA' }), { pace: 'Q · Quick Spark', lens: 'T · Trees (details first)', send: 'D · Direct', recv: 'A · Attuned' }, 'bundle: a Wave Code shaped for side by side');
  const fw = C.combine.fields([{ n: 'A', me: true, d: R.shaped('wavelength', { c: 'QTDA' }) }, { n: 'S', d: R.shaped('wavelength', { c: 'QFNA' }) }], []);
  eq([fw.same, fw.differ], [2, 2], 'bundle: two Wave Codes, two lines the same and two different');
})();

// ------------------------------------------------------------------ sms: and mailto:
(function () {
  const body = 'Here’s my part.\nhttps://spreadloveandacceptance.com/check-ins.html#together=1.abc_-';
  eq(C.smsHref(body), 'sms:?&body=' + encodeURIComponent(body), 'sms: link with the message and the link');
  ok(!/[\s\n]/.test(C.smsHref(body)), 'sms: link has no raw spaces or line breaks');
  const m = C.mailHref('My part of the card', body);
  ok(/^mailto:\?subject=My%20part%20of%20the%20card&body=/.test(m), 'mailto: link with a subject');
  ok(decodeURIComponent(m.split('&body=')[1]) === body, 'mailto: body decodes to the message');
})();

Promise.all(asyncChecks).then(function () {
  console.log('collab tests: ' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
}, function (e) { console.log('FAIL (async):', e); process.exit(1); });
