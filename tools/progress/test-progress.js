#!/usr/bin/env node
/* tools/progress/test-progress.js — checks for assets/js/progress.js ("Your progress") and assets/js/confirm-clear.js.
   Run: node tools/progress/test-progress.js   (exits 1 on any failure; needs Node 18+ for WebCrypto and CompressionStream)

   - backup files: round trip with and without a password; wrong password; a changed file (data, header, plain file)
   - restore: Add (newer wins, key by key), Replace, looks-only settings never touched
   - strict checks: junk, wrong format/version, huge files, too many keys, HTML/script in values, other sites' keys,
     __proto__, iteration counts out of range
   - move links: pack/unpack with and without a password, wrong password, a changed link, a whole URL pasted in
   - My saved entries: save, rename, delete, put back, compare, and they travel in the backup
   - earlier versions: at most HIST_N per item, the size cap, erased items take their versions with them
   - the app lock: the PIN is kept only as a salted hash; right/wrong PIN; when it locks; waits after wrong tries
   - shared-computer mode: stash, wipe and restore touch only this site's keys and keep the mode itself
   - confirm-clear.js: a wrong answer can't clear, Cancel at every step clears nothing, the right answer clears
     exactly the keys asked for, and nothing outside this site's own keys is ever touched */
'use strict';
const path = require('path');
const P = require(path.join(__dirname, '..', '..', 'assets', 'js', 'progress.js'));
const C = require(path.join(__dirname, '..', '..', 'assets', 'js', 'confirm-clear.js'));

let pass = 0, fail = 0;
function ok(cond, name) { if (cond) pass++; else { fail++; console.log('FAIL:', name); } }
function eq(a, b, name) { const A = JSON.stringify(a), B = JSON.stringify(b); ok(A === B, name + (A === B ? '' : '\n   got  ' + A.slice(0, 300) + '\n   want ' + B.slice(0, 300))); }
async function rejects(p, code, name) { try { await p; ok(false, name + ' (did not fail)'); } catch (e) { ok(!code || e.code === code, name + (code && e.code !== code ? ' (code ' + e.code + ', wanted ' + code + ')' : '')); } }
function throws(fn, code, name) { try { fn(); ok(false, name + ' (did not throw)'); } catch (e) { ok(!code || e.code === code, name + (code && e.code !== code ? ' (code ' + e.code + ')' : '')); } }

class Store {
  constructor(o) { this.m = new Map(Object.entries(o || {})); }
  get length() { return this.m.size; }
  key(i) { const k = [...this.m.keys()][i]; return k === undefined ? null : k; }
  getItem(k) { return this.m.has(k) ? this.m.get(k) : null; }
  setItem(k, v) { this.m.set(k, String(v)); }
  removeItem(k) { this.m.delete(k); }
  obj() { return Object.fromEntries([...this.m.entries()].sort()); }
}
const DAY = 86400000;
function sample() {
  return new Store({
    'tol-lemonade-quick': JSON.stringify({ p: ['Sam', 'Alex'], jobs: { dishes: 'Sam' }, note: 'I <3 Sundays' }),
    'tol-weather-v1': JSON.stringify([{ d: '2026-10-01', sky: 'clear' }, { d: '2026-10-02', sky: 'fog' }]),
    'tol-wpf-keep:WP-01': JSON.stringify({ format: 'tol-workpaper-draft', version: 1, workpaper: 'WP-01', state: { values: { a: 'x' } } }),
    'tol-small-wins': JSON.stringify([{ t: 'Called Mom', w: 'Mom' }]),
    'tol-theme': 'dark', 'tol-text-size': 'lg', 'tol-member-email': 'me@example.com', 'tol-pc-wx': '{"lat":1}',
    'other-site-key': 'not ours', 'tol-quiet': '1'
  });
}

(async function main() {
  // ------------------------------------------------------------------ what's collected
  {
    const st = sample(); P.track(st);
    const c = P.collect(st);
    eq(Object.keys(c.keys).sort(), ['tol-lemonade-quick', 'tol-small-wins', 'tol-weather-v1', 'tol-wpf-keep:WP-01'], 'collect: progress only (no looks-only settings, email, location or other sites)');
    ok(Object.keys(c.times).length === 4 && Object.values(c.times).every((t) => typeof t === 'number'), 'collect: a change time for each item');
    ok(P.meaningful('tol-lemonade-quick') && !P.meaningful('tol-arcade-v1'), 'meaningful: tools yes, games no');
    ok(!P.included(P.KEYS.lock) && !P.included(P.KEYS.history) && !P.included(P.KEYS.mode) && P.included(P.KEYS.entries), 'lock, history and mode stay out of backups; saved entries go in');
  }

  // ------------------------------------------------------------------ backup files
  const st0 = sample(); P.track(st0);
  const payload = P.collect(st0);
  const plain = await P.makeBackup(payload, '');
  const locked = await P.makeBackup(payload, 'correct horse 9');
  {
    const f = JSON.parse(plain);
    ok(f.format === 'spread-love-progress' && f.version === 1 && f.encrypted === false && /anyone/i.test(f.note), 'plain file: header, and the plain warning inside');
    const r = await P.readBackup(plain);
    eq(r.keys, payload.keys, 'plain file: round trip');
    eq(r.times, payload.times, 'plain file: change times round trip');
  }
  {
    const f = JSON.parse(locked);
    ok(f.encrypted === true && f.kdf.name === 'PBKDF2' && f.kdf.hash === 'SHA-256' && f.kdf.iterations >= 310000, 'locked file: PBKDF2-SHA256, 310,000+ rounds');
    ok(f.cipher.name === 'AES-GCM' && f.cipher.bits === 256 && Buffer.from(f.kdf.salt, 'base64').length === 16 && Buffer.from(f.cipher.iv, 'base64').length === 12, 'locked file: AES-GCM 256, 16-byte salt, 12-byte IV');
    ok(!locked.includes('Sam') && !locked.includes('Called Mom'), 'locked file: no contents in the clear');
    const r = await P.readBackup(locked, 'correct horse 9');
    eq(r.keys, payload.keys, 'locked file: round trip');
    const again = JSON.parse(await P.makeBackup(payload, 'correct horse 9'));
    ok(again.kdf.salt !== f.kdf.salt && again.cipher.iv !== f.cipher.iv, 'locked file: a fresh salt and IV every time');
    await rejects(P.readBackup(locked, 'wrong horse 9'), 'password', 'locked file: wrong password fails cleanly');
    await rejects(P.readBackup(locked, ''), 'needpassword', 'locked file: no password asks for one');
    ok(P.inspect(locked).encrypted === true && P.inspect(plain).encrypted === false, 'inspect: tells locked from plain');
    // changed files
    const t1 = JSON.parse(locked); const d = Buffer.from(t1.data, 'base64'); d[5] ^= 1; t1.data = d.toString('base64');
    await rejects(P.readBackup(JSON.stringify(t1), 'correct horse 9'), 'password', 'locked file: a changed byte fails');
    const t2 = JSON.parse(locked); t2.created = '2020-01-01T00:00:00.000Z';
    await rejects(P.readBackup(JSON.stringify(t2), 'correct horse 9'), 'password', 'locked file: a changed header (date) fails');
    const t3 = JSON.parse(plain); t3.data.keys['tol-small-wins'] = '[{"t":"changed"}]';
    await rejects(P.readBackup(JSON.stringify(t3)), 'changed', 'plain file: a changed value fails the check');
  }

  // ------------------------------------------------------------------ strict checks
  {
    await rejects(P.readBackup('not json'), 'schema', 'junk: not JSON');
    await rejects(P.readBackup('[]'), 'schema', 'junk: an array');
    await rejects(P.readBackup(JSON.stringify({ format: 'something-else', version: 1 })), 'schema', 'junk: another format');
    const v2 = JSON.parse(plain); v2.version = 2;
    await rejects(P.readBackup(JSON.stringify(v2)), 'version', 'a newer version is refused');
    await rejects(P.readBackup('x'.repeat(P.MAX_FILE + 1)), 'big', 'huge: file over the size limit');
    const lowIt = JSON.parse(locked); lowIt.kdf.iterations = 1000;
    await rejects(P.readBackup(JSON.stringify(lowIt), 'correct horse 9'), 'schema', 'too few rounds refused');
    const hiIt = JSON.parse(locked); hiIt.kdf.iterations = 1e9;
    await rejects(P.readBackup(JSON.stringify(hiIt), 'correct horse 9'), 'schema', 'absurd rounds refused (no lock-up)');
    const many = { keys: {} }; for (let i = 0; i < 700; i++) many.keys['tol-x-' + i] = '1';
    throws(() => P.validate(many), 'big', 'huge: too many keys');
    const big = { keys: { 'tol-a': 'x'.repeat(1500001) } };
    throws(() => P.validate(big), 'empty', 'huge: a single value over the limit is left out');
    const inj = P.validate(JSON.parse(JSON.stringify({ keys: {
      'tol-small-wins': '[{"t":"<img src=x onerror=alert(1)>"}]',
      'tol-letters': '{"a":"\\u003cscript>alert(1)\\u003c/script>"}',
      'tol-wiring-card': 'javascript:alert(1)',
      'tol-rulebook': '{"x":"<svg/onload=alert(1)>"}',
      'tol-tt-a': '{"note":"I <3 you, a < b"}',
      'evil-key': 'x', 'tol-theme': 'dark', 'tol-our-week': '{broken json',
      'tol-our-week2': 42
    } }).replace('"evil-key"', '"__proto__":"x","evil-key"')));
    eq(Object.keys(inj.keys), ['tol-tt-a'], 'HTML/script in values, other sites’ keys, __proto__, looks-only settings, broken JSON and non-strings are all left out');
    ok(inj.dropped === 9, 'the preview can say how many were left out (' + inj.dropped + ')');
    ok(Object.getPrototypeOf(inj.keys) === null && ({}).polluted === undefined, 'no prototype pollution');
    throws(() => P.validate({ keys: { 'evil': 'x' } }), 'empty', 'nothing usable → refused');
    const ft = P.validate({ keys: { 'tol-small-wins': '[]' }, times: { 'tol-small-wins': Date.now() + 10 * DAY, x: 1 } });
    ok(!ft.times['tol-small-wins'], 'a change time in the future is ignored');
  }

  // ------------------------------------------------------------------ restore: Add (newer wins) and Replace
  {
    const now = Date.now();
    const file = { keys: { 'tol-lemonade-quick': '{"p":["FILE"]}', 'tol-weather-v1': '[{"d":"2026-01-01","sky":"gusty"}]', 'tol-household-v1': '{"people":["A","B"]}' },
      times: { 'tol-lemonade-quick': now + 1000, 'tol-weather-v1': now - 30 * DAY, 'tol-household-v1': now - DAY } };
    const st = sample(); P.track(st);
    const r = P.restore(P.validate(file), 'merge', st);
    ok(st.getItem('tol-lemonade-quick') === '{"p":["FILE"]}', 'Add: the file’s newer item wins');
    ok(st.getItem('tol-weather-v1').includes('2026-10-01'), 'Add: the newer item on this device stays');
    ok(st.getItem('tol-household-v1') === '{"p":["A","B"]}'.replace('"p"', '"people"'), 'Add: missing items are added');
    ok(st.getItem('tol-small-wins') !== null && st.getItem('tol-theme') === 'dark' && st.getItem('other-site-key') === 'not ours', 'Add: everything else left alone');
    eq([r.added, r.updated, r.kept, r.removed], [1, 1, 1, 0], 'Add: counts');
    const st2 = sample(); P.track(st2);
    const r2 = P.restore(P.validate(file), 'replace', st2);
    ok(st2.getItem('tol-small-wins') === null && st2.getItem('tol-wpf-keep:WP-01') === null, 'Replace: progress not in the file is removed');
    ok(st2.getItem('tol-weather-v1').includes('gusty'), 'Replace: the file’s version wins even when older');
    ok(st2.getItem('tol-theme') === 'dark' && st2.getItem('tol-member-email') === 'me@example.com' && st2.getItem('other-site-key') === 'not ours', 'Replace: looks-only settings, email and other keys untouched');
    ok(r2.removed === 2, 'Replace: counts removed (' + r2.removed + ')');
    const sum = P.summary(P.validate(file));
    ok(sum.length === 3 && sum.every((g) => g.name && g.n === 1), 'summary: tool names and counts (no contents)');
  }

  // ------------------------------------------------------------------ move links
  {
    const o = await P.packLink(payload, '');
    ok(/^1\.oz\.[A-Za-z0-9_-]+$/.test(o), 'open link: version, flags, base64url');
    eq((await P.unpackLink(o)).keys, payload.keys, 'open link: round trip');
    eq((await P.unpackLink('https://spreadloveandacceptance.com/on-this-device.html#restore=' + o)).keys, payload.keys, 'a whole URL pasted in works');
    const l = await P.packLink(payload, 'pw-123456');
    ok(/^1\.pz\./.test(l) && P.linkInfo(l).encrypted, 'locked link: flagged');
    eq((await P.unpackLink(l, 'pw-123456')).keys, payload.keys, 'locked link: round trip');
    await rejects(P.unpackLink(l, 'nope-123456'), 'password', 'locked link: wrong password fails');
    await rejects(P.unpackLink(l, ''), 'needpassword', 'locked link: asks for the password');
    const flip = (s) => { const i = s.length - 10; return s.slice(0, i) + (s[i] === 'A' ? 'B' : 'A') + s.slice(i + 1); };
    await rejects(P.unpackLink(flip(o)), null, 'open link: a changed character fails');
    await rejects(P.unpackLink(flip(l), 'pw-123456'), 'password', 'locked link: a changed character fails');
    await rejects(P.unpackLink('1.oz.' + 'A'.repeat(P.MAX_LINK + 20)), 'big', 'a too-long link is refused');
    await rejects(P.unpackLink('#restore=<script>'), 'schema', 'junk link refused');
    ok(o.length < 2000 - 60, 'a small set of progress fits in a QR code (' + o.length + ' chars)');
  }

  // ------------------------------------------------------------------ My saved entries
  {
    const st = sample(); P.track(st);
    const e1 = P.saveEntry(st, { group: 'lemon', name: 'Week one' }, Date.now() - 7 * DAY);
    ok(e1 && e1.g === 'lemon' && e1.name === 'Week one' && e1.data['tol-lemonade-quick'], 'save: an entry from a tool’s keys');
    st.setItem('tol-lemonade-quick', JSON.stringify({ p: ['Sam', 'Alex'], jobs: { dishes: 'Alex' }, note: 'swapped' }));
    const e2 = P.saveEntry(st, { group: 'lemon' });
    ok(/The Lemonade Stand/.test(e2.name) && /answers?/.test(e2.sum), 'save: default name and a short summary');
    const e3 = P.saveEntry(st, { group: 'lemon', name: '<b>x</b>' + 'y'.repeat(200) });
    ok(!/[<>]/.test(e3.name) && e3.name.length <= 80, 'save: names are plain text and short');
    eq(P.entries(st).map((e) => e.id), [e1.id, e2.id, e3.id], 'list: all three');
    ok(P.renameEntry(st, e1.id, 'First week') && P.entries(st)[0].name === 'First week', 'rename');
    ok(!P.renameEntry(st, e1.id, '   '), 'rename: empty refused');
    const d = P.compare(e1, e2);
    ok(d.some((x) => /dishes/.test(x.path) && x.was === 'Sam' && x.now === 'Alex'), 'compare: a changed answer');
    ok(d.some((x) => /note/.test(x.path)), 'compare: the other changed answer');
    ok(P.flatten(e1.data).some((r) => r[0].includes('lemonade-quick') && r[1] === 'Sam'), 'open: answers as plain path/value rows');
    ok(P.putBack(st, e1.id) === 1 && JSON.parse(st.getItem('tol-lemonade-quick')).jobs.dishes === 'Sam', 'put back: the tool has the old answers again');
    ok(P.deleteEntry(st, e3.id) && P.entries(st).length === 2 && !P.deleteEntry(st, 'nope'), 'delete');
    // export and import with the backup
    const file = await P.makeBackup(P.collect(st), 'entries-pw');
    const st2 = new Store();
    P.restore(await P.readBackup(file, 'entries-pw'), 'merge', st2);
    eq(P.entries(st2).map((e) => e.name), ['First week', e2.name], 'export: saved entries travel in the backup and come back');
    throws(() => P.saveEntry(new Store(), { group: 'lemon' }), 'empty', 'save: nothing to save');
    // a tool's result, saved from its result area (collab.js "Save this combined view")
    const r1 = P.saveResult(st, { tool: 'together:wp-01', title: 'Our week <b>', text: 'Sam: 12 jobs\nAlex: 9 jobs <script>x</script>', data: { people: [{ n: 'Sam', d: { a: 1 } }], kind: 'week' } });
    ok(r1.kind === 'result' && r1.g === 'together' && !/[<>]/.test(r1.name) && !/<script/i.test(r1.text) && r1.sum === 'Sam: 12 jobs', 'result entry: saved as plain text, grouped, short summary');
    ok(P.entries(st).some((e) => e.id === r1.id), 'result entry: listed with the others');
    ok(P.putBack(st, r1.id) === 0, 'result entry: nothing to put back into a tool');
    const r2 = P.saveResult(st, { tool: 'together:wp-01', text: 'Sam: 10 jobs', data: { people: [{ n: 'Sam', d: { a: 2 } }], kind: 'week' } });
    ok(P.compare(r1, r2).some((x) => x.was === '1' && x.now === '2'), 'result entry: compare over time');
    const back = new Store(); P.restore(await P.readBackup(await P.makeBackup(P.collect(st), '')), 'merge', back);
    ok(P.entries(back).some((e) => e.id === r1.id && e.text === r1.text), 'result entry: travels in the backup and passes the strict checks');
    ok(P.saveEntry({ tool: 'x', text: 'y' }) === false, 'saveEntry({ … }) outside a browser returns false');
    P.deleteEntry(st, r1.id); P.deleteEntry(st, r2.id);
    const bad = new Store({ 'tol-entries-v1': JSON.stringify({ v: 1, list: [{ id: 'abcd', g: 'lemon', t: 1, name: 'x', data: { 'evil-key': 'x' } }, { id: 'zz', g: 'nope' }] }) });
    ok(P.entries(bad).length === 0, 'list: malformed entries are ignored');
    const evil = new Store({ 'tol-entries-v1': JSON.stringify({ v: 1, list: [{ id: 'abcde', g: 'lemon', t: 1, name: 'x', sum: '', data: { 'tol-lemonade-quick': '{"a":"\\\\u003cscript>"}', 'tol-small-wins': '<img src=x>' } }] }) });
    P.putBack(evil, 'abcde');
    ok(evil.getItem('tol-small-wins') === null, 'put back: an HTML value is never written into a tool');
  }

  // ------------------------------------------------------------------ earlier versions
  {
    const st = sample(); let t = Date.now() - 100 * 60000;
    for (let i = 0; i < 15; i++) { st.setItem('tol-small-wins', JSON.stringify([{ t: 'win ' + i }])); P.recordHistory(st, t + i * 60000); }
    const h = P.history(st)['tol-small-wins'];
    ok(h.length === P.HIST_N, 'history: at most ' + P.HIST_N + ' versions per item (' + h.length + ')');
    ok(h[h.length - 1].v.includes('win 14') && h[0].v.includes('win 5'), 'history: the newest are kept');
    P.recordHistory(st, t + 99 * 60000);
    ok(P.history(st)['tol-small-wins'].length === P.HIST_N, 'history: no new version when nothing changed');
    ok(!P.history(st)['tol-theme'] && !P.history(st)['tol-arcade-v1'], 'history: only tools, never looks-only settings');
    ok(P.goBack(st, 'tol-small-wins', h[2].t) && st.getItem('tol-small-wins').includes('win 7'), 'go back to an earlier version');
    // size cap
    const big = new Store();
    for (let k = 0; k < 8; k++) for (let i = 0; i < 10; i++) { big.setItem('tol-wpf-keep:WP-0' + k, JSON.stringify({ x: String(i).repeat(200000) })); P.recordHistory(big, t + i * 1000 + k); }
    ok((big.getItem('tol-history-v1') || '').length <= 1200000, 'history: the whole history stays under its size cap (' + (big.getItem('tol-history-v1') || '').length + ')');
    st.removeItem('tol-small-wins'); P.recordHistory(st);
    ok(!P.history(st)['tol-small-wins'], 'history: erasing an item erases its versions');
    eq(Object.keys(P.collect(st).keys).filter((k) => k === 'tol-history-v1'), [], 'history never goes into a backup');
  }

  // ------------------------------------------------------------------ the app lock
  {
    const rec = await P.pinRecord('4821', 5);
    const s = JSON.stringify(rec);
    ok(!s.includes('4821') && rec.h && Buffer.from(rec.salt, 'base64').length === 16 && rec.it >= 310000 && rec.alg === 'PBKDF2-SHA256', 'PIN: kept only as a salted PBKDF2 hash');
    const rec2 = await P.pinRecord('4821', 5);
    ok(rec2.h !== rec.h, 'PIN: same PIN, different salt, different hash');
    ok(await P.checkPin('4821', rec), 'PIN: right PIN opens');
    ok(!(await P.checkPin('4822', rec)), 'PIN: wrong PIN doesn’t');
    ok(!(await P.checkPin('48211', rec)) && !(await P.checkPin('', rec)) && !(await P.checkPin('abcd', rec)), 'PIN: wrong length or letters don’t');
    await rejects(P.pinRecord('123'), 'pin', 'PIN: 3 digits refused');
    await rejects(P.pinRecord('1234567'), 'pin', 'PIN: 7 digits refused');
    ok(P.validPin('123456') && !P.validPin('12 34'), 'PIN: 4 to 6 digits');
    const now = Date.now();
    ok(P.lockDue(Object.assign({}, rec), now), 'lock: due on a fresh start (no time away recorded)');
    ok(!P.lockDue(Object.assign({}, rec, { away: now - 60000 }), now), 'lock: not due after 1 minute away when set to 5');
    ok(P.lockDue(Object.assign({}, rec, { away: now - 6 * 60000 }), now), 'lock: due after 6 minutes away when set to 5');
    ok(P.lockDue(Object.assign({}, rec, { mins: 0, away: now - 1 }), now), 'lock: "every time it opens" is always due');
    ok(!P.lockDue(null, now) && !P.lockDue({ on: 0 }, now), 'lock: off means never');
    ok(P.failDelay(4) === 0 && P.failDelay(5) === 30000 && P.failDelay(6) === 60000 && P.failDelay(30) === 15 * 60000, 'lock: waits grow after 5 wrong tries, up to 15 minutes');
    ok(!(await P.checkPin('4821', Object.assign({}, rec, { it: 1 }))), 'lock: a tampered rounds count is refused');
  }

  // ------------------------------------------------------------------ shared-computer mode
  {
    const ls = sample(); ls.setItem('tol-save-mode-v1', 'shared'); ls.setItem('cwd-v1', '{"a":1}'); ls.setItem('bears-dojo-bear', 'x');
    const ss = new Store();
    ok(P.sharedStash(ls, ss), 'shared: stash into this tab');
    const n = P.sharedWipe(ls);
    ok(ls.getItem('tol-lemonade-quick') === null && ls.getItem('tol-theme') === null && ls.getItem('cwd-v1') === null && ls.getItem('bears-dojo-bear') === null && ls.getItem('tol-member-email') === null, 'shared: wipe leaves none of this site’s notes');
    ok(ls.getItem('tol-save-mode-v1') === 'shared' && ls.getItem('other-site-key') === 'not ours', 'shared: wipe keeps the mode and never touches other keys (' + n + ' wiped)');
    const back = P.sharedRestore(ls, ss);
    ok(back === n && ls.getItem('tol-lemonade-quick').includes('Sam'), 'shared: the next page of the same tab gets them back');
    ls.setItem('tol-small-wins', '[{"t":"newer"}]');
    P.sharedRestore(ls, ss);
    ok(ls.getItem('tol-small-wins') === '[{"t":"newer"}]', 'shared: restore never overwrites what’s already there');
    ss.setItem(P.KEYS.stash, JSON.stringify({ 'other-key': 'x', 'tol-x': 5 }));
    const ls2 = new Store(); P.sharedRestore(ls2, ss);
    ok(ls2.length === 0, 'shared: a stash can’t write other sites’ keys or non-strings');
  }

  // ------------------------------------------------------------------ confirm-clear.js
  {
    const seq = [0.1, 0.5, 0.9, 0.3]; let i = 0; const rnd = () => seq[i++ % seq.length];
    const p = C.problem(rnd);
    ok(p.a >= 1 && p.a <= 9 && p.b >= 1 && p.b <= 9 && p.answer === p.a + p.b, 'sum: two single digits');
    const seen = new Set(); for (let k = 0; k < 200; k++) { const q = C.problem(); seen.add(q.a + '+' + q.b); ok(q.a >= 1 && q.a <= 9 && q.b >= 1 && q.b <= 9, 'sum digits in range'); }
    ok(seen.size > 30, 'sum: a new problem each time (' + seen.size + ' different in 200)');
    ok(C.check({ answer: 7 }, ' 7 ') && !C.check({ answer: 7 }, '8') && !C.check({ answer: 7 }, '7a') && !C.check({ answer: 7 }, ''), 'check: only the right number');

    const mkStore = () => new Store({ 'tol-lemonade-quick': '1', 'tol-lemonade-stand-v2': '2', 'tol-weather-v1': '3', 'cwd-v1': '4', 'other-site': 'x', 'lemonade': 'y' });
    // Cancel at each step clears nothing
    for (const at of ['ask', 'sure', 'math']) {
      const st = mkStore(); let cleared = false;
      const f = C.flow({ onConfirm: () => { cleared = true; C.clear(['tol-lemonade-'], st); } });
      if (at !== 'ask') f.yes(); if (at === 'math') f.yes();
      ok(f.step === at, 'flow reaches ' + at);
      f.cancel();
      const done = await f.clearNow();
      ok(!done && !cleared && st.length === 6, 'Cancel at "' + at + '" clears nothing');
    }
    // a wrong answer can't clear
    {
      const st = mkStore(); let cleared = false;
      const f = C.flow({ onConfirm: () => { cleared = true; C.clear(['tol-lemonade-'], st); } });
      f.yes(); f.yes();
      const before = f.p;
      ok(!(await f.clearNow()), 'Clear now does nothing before an answer');
      ok(!f.answer(String(before.answer + 1)), 'a wrong answer is wrong');
      ok(f.p !== before, 'a wrong answer gives a new problem');
      ok(!(await f.clearNow()) && !cleared && st.length === 6, 'a wrong answer can’t clear');
      ok(f.answer(String(f.p.answer)), 'the right answer is right');
      ok(await f.clearNow(), 'Clear now works after the right answer');
      ok(cleared, 'onConfirm ran');
      eq(st.obj(), { 'cwd-v1': '4', 'lemonade': 'y', 'other-site': 'x', 'tol-weather-v1': '3' }, 'the right answer clears exactly the keys asked for');
      ok(!(await f.clearNow()), 'it clears only once');
    }
    // the short form (shared computer) goes straight from step 1 to the sum
    { const f = C.flow({ short: true }); f.yes(); ok(f.step === 'math', 'short: step 1, then the sum on one screen'); }
    // never anything but this site's own keys
    {
      const st = mkStore();
      eq(C.find(st, '*'), ['cwd-v1', 'tol-lemonade-quick', 'tol-lemonade-stand-v2', 'tol-weather-v1'], 'find("*"): this site’s keys only');
      C.clear('*', st);
      eq(st.obj(), { 'lemonade': 'y', 'other-site': 'x' }, 'clear("*") never touches other keys');
      const st2 = mkStore(); C.clear(['other-site', 'lemonade', ''], st2);
      ok(st2.length === 6, 'asking to clear a non-site key does nothing');
      ok(C.ours('br-q') && !C.ours('__proto__') && !C.ours('tol-<x>'), 'ours(): the site’s key shapes only');
    }
  }

  console.log((fail ? 'FAILED ' : 'ok ') + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
