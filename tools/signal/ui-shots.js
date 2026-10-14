/* ui-shots.js — the Chat analyzer's screenshot reader, end to end, in a real browser.

   1. Accuracy: renders made-up chat screenshots (tools/signal/fake-chats.js: iMessage light with a keyboard and
      dark, WhatsApp light and dark, Messenger, Android Messages light and dark, Instagram, a WhatsApp group chat,
      two overlapping screenshots, and a chat where my messages are on the left), reads each one with the on-device
      OCR (assets/vendor/tesseract/) and measures who-said-what and the text against what a person reads off it.
      Emoji are left out of the character count: the OCR can't read them.
   2. The page: which side is yours (asked once, remembered), straight to the read with a closed "What I read",
      "Edit what I read", one message going to the right single-message mode, the "From a screenshot" button,
      a pasted screenshot, a group chat's names, and the one question when a bubble's side can't be told.
      At 390x844 (touch) and 1366x768, light and dark, with no console errors and no sideways scroll.

     python3 -m http.server 8540 --bind 127.0.0.1      (from the repo root)
     PORT=8540 node tools/signal/ui-shots.js        (SHOTS=folder for the screenshots)                 */
'use strict';
const { chromium } = require(process.env.PW || '/opt/node22/lib/node_modules/playwright');
const path = require('path'), fs = require('fs'), os = require('os');
const F = require('./fake-chats.js');
const PORT = process.env.PORT || 8540, BASE = 'http://127.0.0.1:' + PORT, URL = BASE + '/signal-translator.html';
const OUT = process.env.SHOTS || fs.mkdtempSync(path.join(os.tmpdir(), 'chat-shots-'));
const FAKE = path.join(OUT, 'fake'); fs.mkdirSync(FAKE, { recursive: true });
let pass = 0, fail = 0; const errs = [];
const ok = (c, m) => { if (c) pass++; else { fail++; errs.push(m); } };

// ---- scoring: what a person reads off the screenshot vs what was read ----
const EMO = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu;
const norm = s => String(s).replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(EMO, '').replace(/\s+/g, ' ').trim();
function lev(a, b) { let prev = Array.from({ length: b.length + 1 }, (_, j) => j); for (let i = 1; i <= a.length; i++) { const cur = [i]; for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = cur; } return prev[b.length]; }
function align(want, got) {   // both in screen order
  const m = want.length, n = got.length, sim = (i, j) => { const a = norm(want[i][1]), b = norm(got[j].text); return 1 - lev(a, b) / Math.max(a.length, b.length, 1); };
  const D = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0)), P = Array.from({ length: m + 1 }, () => Array(n + 1).fill(''));
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) {
    const s = sim(i - 1, j - 1), o = [[D[i - 1][j], 'u'], [D[i][j - 1], 'l'], [s > 0.4 ? D[i - 1][j - 1] + s : -1, 'd']].sort((x, y) => y[0] - x[0]);
    D[i][j] = o[0][0]; P[i][j] = o[0][1];
  }
  const pairs = []; let i = m, j = n;
  while (i > 0 && j > 0) { if (P[i][j] === 'd') { pairs.unshift([i - 1, j - 1]); i--; j--; } else if (P[i][j] === 'u') i--; else j--; }
  return pairs;
}
function score(want, out, me) {
  const got = out.bubbles, pairs = align(want, got); let chars = 0, bad = 0, sides = 0, named = 0, names = 0; const notes = [];
  want.forEach(w => chars += norm(w[1]).length);
  const mi = new Set(pairs.map(p => p[0])), gi = new Set(pairs.map(p => p[1]));
  want.forEach((w, i) => { if (!mi.has(i)) { bad += norm(w[1]).length; notes.push('missing: ' + w[1]); } });
  got.forEach((g, j) => { if (!gi.has(j)) { bad += norm(g.text).length; notes.push('extra: ' + g.text); } });
  pairs.forEach(([i, j]) => {
    const w = want[i], g = got[j], e = lev(norm(w[1]), norm(g.text)); bad += e;
    if (e) notes.push('text: "' + norm(w[1]) + '" read as "' + norm(g.text) + '"');
    if ((g.side === me) === (w[0] === 'me')) sides++; else notes.push('side: ' + w[1]);
    if (w[0] !== 'me' && w[0] !== 'them') { named++; if (g.who === w[0]) names++; else notes.push('name: ' + w[0] + ' read as ' + (g.who || '-')); }
  });
  return { n: want.length, sides, chars, bad, named, names, notes };
}

(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  // ---- 1. render the made-up screenshots ----
  const mirror = html => html.replace(/align-self:flex-start/g, 'align-self:@S').replace(/align-self:flex-end/g, 'align-self:flex-start').replace(/align-self:@S/g, 'align-self:flex-end');
  const cases = F.CASES.concat([F.TWO, { tag: 'imessage-mine-on-left', html: mirror(F.imessage(F.BINS, { name: 'Alex' })), want: F.BINS, name: 'Alex', me: 'left' }]);
  const extra = {
    one: F.imessage([['them', 'Fine. Do what you want.']], { name: 'Alex' }),
    // one bubble right across the middle: its side really can't be told from where it sits
    unsure: F.android([['them', 'Are you coming to the party on Saturday?'], ['me', 'Maybe, I have to check with work first.'], ['them', 'Let me know by Thursday please']], { name: 'Riley' })
      .replace('.me{align-self:flex-end;', '.me{align-self:center;max-width:80%;width:80%;')
  };
  const shot = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 });
  const render = async (html, f) => { await shot.setContent(html); await shot.waitForTimeout(60); await shot.screenshot({ path: f }); return f; };
  for (const c of cases) { c.files = []; const hs = [].concat(c.html); for (let i = 0; i < hs.length; i++) c.files.push(await render(hs[i], path.join(FAKE, c.tag + '-' + (i + 1) + '.png'))); }
  for (const k of Object.keys(extra)) extra[k] = await render(extra[k], path.join(FAKE, 'extra-' + k + '.png'));
  await shot.close();

  // ---- 2. accuracy, through the same reader the page uses ----
  {
    const p = await b.newPage();
    const pageErrs = []; p.on('pageerror', e => pageErrs.push(e.message));
    const reqs = []; p.on('request', r => reqs.push(r.url()));
    await p.route('**/*', r => /^http:\/\/(127\.0\.0\.1|localhost)/.test(r.request().url()) ? r.continue() : r.abort());
    await p.goto(URL + '#conversation'); await p.waitForFunction(() => window.TOLShotReader && TOLShotReader.read, null, { timeout: 15000 });
    let T = { n: 0, sides: 0, chars: 0, bad: 0, named: 0, names: 0 }; const rows = [];
    for (const c of cases) {
      const files = c.files.map(f => ({ name: path.basename(f), b64: fs.readFileSync(f).toString('base64') }));
      const t0 = Date.now();
      const r = await p.evaluate(async fs => TOLShotReader.read(fs.map(f => { const bin = atob(f.b64), a = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return new File([a], f.name, { type: 'image/png' }); }), () => {}), files);
      const s = score(c.want, r, c.me || 'right');
      Object.keys(T).forEach(k => T[k] += s[k]);
      rows.push(`${c.tag.padEnd(26)} sides ${s.sides}/${s.n}  text ${(100 * (1 - s.bad / s.chars)).toFixed(1)}%${s.named ? `  names ${s.names}/${s.named}` : ''}  name "${r.name}"  ${((Date.now() - t0) / 1000).toFixed(1)}s` + s.notes.map(x => '\n      ' + x).join(''));
      ok(s.sides === s.n, `${c.tag}: sides ${s.sides}/${s.n}: ${s.notes.join(' | ')}`);
      ok(1 - s.bad / s.chars >= 0.98, `${c.tag}: text ${(100 * (1 - s.bad / s.chars)).toFixed(1)}%: ${s.notes.join(' | ')}`);
      ok(s.names === s.named, `${c.tag}: group names ${s.names}/${s.named}`);
      if (c.name) ok(r.name === c.name, `${c.tag}: their name "${r.name}" (want ${c.name})`);
      ok(!r.bubbles.some(x => /Delivered|iMessage|online|Active|Seen|82%|\b9:\d\d\b|Today|TODAY|RCS|Message\.\.\.|qwerty|space|return/.test(x.text)), `${c.tag}: chat furniture in the read: ${r.bubbles.map(x => x.text).join(' | ')}`);
    }
    console.log('Screenshot reading accuracy (made-up chats):\n' + rows.join('\n'));
    console.log(`TOTAL: sides ${T.sides}/${T.n} (${(100 * T.sides / T.n).toFixed(1)}%), text ${(100 * (1 - T.bad / T.chars)).toFixed(2)}% of ${T.chars} characters, group names ${T.names}/${T.named}`);
    ok(!reqs.some(u => /tesseract|traineddata/.test(u) && !/^http:\/\/(127\.0\.0\.1|localhost)/.test(u)), 'the OCR files come from this site');
    ok(!pageErrs.length, 'accuracy page errors: ' + pageErrs.join(' | '));
    await p.close();
  }

  // ---- 3. the page ----
  for (const [w, h, scheme] of [[390, 844, 'light'], [1366, 768, 'dark']]) {
    const tag = w + 'x' + h + ' ' + scheme;
    const ctx = await b.newContext({ viewport: { width: w, height: h }, colorScheme: scheme, hasTouch: w < 500, isMobile: w < 500 });
    const p = await ctx.newPage();
    const pageErrs = []; p.on('pageerror', e => pageErrs.push('pageerror: ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) pageErrs.push('console: ' + m.text()); });
    const reqs = []; p.on('request', r => reqs.push(r.url()));
    await p.route('**/*', r => /^http:\/\/(127\.0\.0\.1|localhost)/.test(r.request().url()) ? r.continue() : r.abort());
    const overflow = () => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const waitRead = () => p.waitForSelector('#cr-out .cr-summary, #cr-out .cr-thread', { timeout: 240000 });
    const clearOut = () => p.evaluate(() => { ['cr-out', 'cr-review'].forEach(id => { const e = document.getElementById(id); if (e) e.innerHTML = ''; }); const pre = document.getElementById('cr-pre'); if (pre) pre.innerHTML = ''; });
    await p.goto(URL); await p.waitForLoadState('load');
    ok(!reqs.some(u => /conversation-reader|tesseract/.test(u)), `${tag}: nothing for screenshots loads with the page`);
    // a: the first screenshot: which side is yours, then straight to the read
    await p.check('input[name="stmode"][value="chat"]'); await p.waitForSelector('#cr-side');
    ok(await p.evaluate(() => document.querySelector('#cr-side').checkVisibility() && document.querySelector('input[name="cr-side"][value="right"]').checked && /Continue/.test(document.querySelector('#cr-shot-pick').innerText)), `${tag}: the side question shows first, with Right picked`);
    ok(!reqs.some(u => /tesseract/.test(u)), `${tag}: the OCR loads only when a screenshot is picked`);
    await p.screenshot({ path: path.join(OUT, `shots-${w}-${scheme}-1-side.png`) });
    await p.setInputFiles('#cr-shot', cases.find(c => c.tag === 'whatsapp-light').files);
    await waitRead();
    const a = await p.evaluate(() => ({ read: document.querySelector('#cr-read'), open: document.querySelector('#cr-read').open, what: document.querySelector('#cr-read').innerText, box: document.querySelector('#cr-input').value,
      out: document.querySelector('#cr-out').innerText, pre: (document.querySelector('#cr-pre') || { innerText: '' }).innerText, side: localStorage.getItem('tol-shot-side'),
      line: document.querySelector('#cr-side-line').checkVisibility() && document.querySelector('#cr-side-line').innerText, q: document.querySelector('#cr-side').checkVisibility() }));
    ok(!a.open && /What I read/.test(a.what), `${tag}: "What I read" is there and closed`);
    ok(/^Mom: Can you take the bins out tonight\?$/m.test(a.box) && /^Me: Sure, after dinner$/m.test(a.box) && a.box.split('\n').length === 7, `${tag}: read straight into the conversation: ${a.box}`);
    ok(!/Which one is you\?/.test(a.pre) && /7 messages/.test(a.out), `${tag}: the read starts without asking who you are`);
    ok(a.side === 'right' && /Your messages: right/.test(a.line || '') && !a.q, `${tag}: the side is remembered and shown: ${JSON.stringify([a.side, a.line, a.q])}`);
    ok(await overflow() <= 0, `${tag}: overflow after a screenshot`);
    await p.click('#cr-read > summary');
    await p.screenshot({ path: path.join(OUT, `shots-${w}-${scheme}-2-read.png`) });
    // b: Edit what I read is there if wanted, and reads again
    await p.click('#cr-read-edit'); await p.waitForSelector('#cr-rv-list li');
    ok((await p.$$('#cr-rv-list li')).length === 7, `${tag}: Edit what I read shows each message`);
    await p.fill('#cr-rv-list textarea[data-text="4"]', 'Fine, whatever.'); await p.evaluate(() => { document.getElementById('cr-out').innerHTML = ''; }); await p.click('#cr-rv-go'); await waitRead();
    ok(/Mom: Fine, whatever\./.test(await p.$eval('#cr-input', e => e.value)), `${tag}: an edit is read again`);
    // c: a group chat: each person's name
    await clearOut(); await p.setInputFiles('#cr-shot', cases.find(c => c.tag === 'whatsapp-group').files); await waitRead();
    const g = await p.$eval('#cr-input', e => e.value);
    ok(/^Sam: Who.s bringing the snacks on Sunday\?$/m.test(g) && /^Priya: I.ll do drinks/m.test(g) && /^Me: I can bring crisps/m.test(g), `${tag}: group chat names: ${g}`);
    // d: one message: the right single-message mode, read straight away
    await p.setInputFiles('#cr-shot', extra.one); await p.waitForSelector('#vplain', { timeout: 120000 });
    const one = await p.evaluate(() => ({ mode: document.querySelector('input[name="stmode"]:checked').value, box: document.querySelector('#phrase').value }));
    ok(one.mode === 'got' && one.box === 'Fine. Do what you want.', `${tag}: one message from them opens "A message I got": ${JSON.stringify(one)}`);
    await p.screenshot({ path: path.join(OUT, `shots-${w}-${scheme}-3-one.png`) });
    // e: "From a screenshot" by the box, with the side known: straight to the picker
    await p.check('input[name="stmode"][value="send"]');
    const [chooser] = await Promise.all([p.waitForEvent('filechooser', { timeout: 10000 }), p.click('#stFromShot')]);
    await clearOut(); await chooser.setFiles(cases.find(c => c.tag === 'messenger-light').files); await waitRead();
    ok(/^Jordan: Did you see my message about the weekend\?$/m.test(await p.$eval('#cr-input', e => e.value)), `${tag}: "From a screenshot" reads the picked screenshot`);
    // f: mine on the left: change the side, and it follows
    await p.click('#cr-side-change'); await p.check('input[name="cr-side"][value="left"]', { force: true });
    await clearOut(); await p.setInputFiles('#cr-shot', cases.find(c => c.tag === 'imessage-mine-on-left').files); await waitRead();
    const lf = await p.evaluate(() => ({ box: document.querySelector('#cr-input').value, side: localStorage.getItem('tol-shot-side') }));
    ok(lf.side === 'left' && /^Me: Sure, after dinner$/m.test(lf.box) && /^Alex: Fine\.$/m.test(lf.box), `${tag}: mine on the left: ${JSON.stringify(lf)}`);
    await p.click('#cr-side-change'); await p.check('input[name="cr-side"][value="right"]', { force: true });
    // g: a side that can't be told: one question about that message, then the read
    await clearOut(); await p.setInputFiles('#cr-shot', extra.unsure); await p.waitForSelector('.cr-ask1', { timeout: 120000 });
    const q = await p.$eval('.cr-ask1', e => e.innerText);
    ok(/who sent this message\?/.test(q) && /Maybe, I have to check with work first/.test(q), `${tag}: one question for an unclear side: ${q}`);
    await p.screenshot({ path: path.join(OUT, `shots-${w}-${scheme}-4-ask.png`) });
    await p.click('.cr-ask1 [data-mine="1"]'); await waitRead();
    ok(/^Me: Maybe, I have to check with work first\.$/m.test(await p.$eval('#cr-input', e => e.value)), `${tag}: the answer sets the side`);
    // h: a screenshot pasted into the one-message box goes to the screenshot reader
    await p.check('input[name="stmode"][value="got"]'); await clearOut();
    const b64 = fs.readFileSync(cases.find(c => c.tag === 'android-light').files[0]).toString('base64');
    await p.evaluate(b64 => { const bin = atob(b64), a = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
      const dt = new DataTransfer(); dt.items.add(new File([a], 'shot.png', { type: 'image/png' })); document.querySelector('#phrase').dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })); }, b64);
    await waitRead();
    ok(/^Riley: Can you take the bins out tonight\?$/m.test(await p.$eval('#cr-input', e => e.value)), `${tag}: a pasted screenshot is read`);
    ok(await overflow() <= 0, `${tag}: overflow at the end`);
    await p.screenshot({ path: path.join(OUT, `shots-${w}-${scheme}-5-pasted.png`), fullPage: false });
    ok(!pageErrs.length, `${tag}: console errors: ${pageErrs.join(' | ')}`);
    await ctx.close();
  }
  await b.close();
  console.log('screenshots in ' + OUT);
  console.log(`Screenshots: ${pass} checks passed, ${fail} failed`);
  if (fail) { errs.forEach(e => console.log('  - ' + e)); process.exit(1); }
})();
