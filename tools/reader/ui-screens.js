/* ui-screens.js — the Conversation Reader's screenshot import, end to end, in a real browser.
   Renders fake chat screenshots (iMessage-like and WhatsApp-like, light and dark, and two overlapping
   screenshots of one long chat), feeds them to /conversation-reader.html, and checks the review screen:
   the right messages, on the right sides, with the contact's name, and no clock, "Delivered" or timestamps.
   Everything runs on the device: the OCR files are in assets/vendor/tesseract/.

     python3 -m http.server 8996 &      (from the repo root)
     PORT=8996 node tools/reader/ui-screens.js      (SHOTS=folder to keep the screenshots)          */
'use strict';
const { chromium } = require(process.env.PW || '/opt/node22/lib/node_modules/playwright');
const path = require('path'), fs = require('fs'), os = require('os');
const PORT = process.env.PORT || 8996;
const OUT = process.env.SHOTS || fs.mkdtempSync(path.join(os.tmpdir(), 'cr-shots-'));
let pass = 0, fail = 0; const errs = [];
const ok = (c, m) => { if (c) pass++; else { fail++; errs.push(m); } };

const CHAT = [
  ['them', 'Can you take the bins out tonight?'],
  ['me', 'Sure, after dinner'],
  ['them', 'It would be nice if someone helped around here without being asked every single time.'],
  ['me', 'I literally just got home. You always do this.'],
  ['them', 'Fine.'],
  ['me', 'Sorry. Can we talk at 8?'],
  ['them', 'Ok. Thanks for saying that.'],
  ['me', 'I will do the bins right now'],
  ['them', 'Thank you, that really helps'],
  ['me', 'Love you']
];

function esc(s) { return String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]); }
function imessage(msgs, dark, name) {
  const bg = dark ? '#000' : '#fff', ink = dark ? '#fff' : '#000', them = dark ? '#262628' : '#E9E9EB', themInk = dark ? '#fff' : '#000';
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  body{margin:0;background:${bg};color:${ink};font:17px -apple-system,Helvetica,Arial,sans-serif;width:390px;height:844px;overflow:hidden}
  .status{display:flex;justify-content:space-between;padding:14px 26px 0;font-weight:600;font-size:16px}
  .head{text-align:center;padding:6px 0 10px;border-bottom:1px solid ${dark ? '#222' : '#ddd'}}
  .av{width:52px;height:52px;border-radius:50%;background:#9aa0a6;margin:0 auto 4px}
  .nm{font-size:13px}
  .day{text-align:center;color:#8e8e93;font-size:12px;margin:10px 0}
  .log{padding:0 12px;display:flex;flex-direction:column;gap:8px}
  .b{max-width:72%;padding:8px 13px;border-radius:18px;line-height:1.3}
  .them{align-self:flex-start;background:${them};color:${themInk}}
  .me{align-self:flex-end;background:#0B84FE;color:#fff}
  .del{align-self:flex-end;color:#8e8e93;font-size:11px;margin-top:-4px}
  .bar{position:absolute;bottom:18px;left:12px;right:12px;border:1px solid ${dark ? '#333' : '#ccc'};border-radius:18px;padding:7px 14px;color:#8e8e93;font-size:16px}
  </style></head><body><div class="status"><span>9:41</span><span>82%</span></div>
  <div class="head"><div class="av"></div><div class="nm">${esc(name)} &rsaquo;</div></div>
  <div class="day">Today 9:30 PM</div><div class="log">${msgs.map(([w, t]) => `<div class="b ${w}">${esc(t)}</div>`).join('')}${msgs[msgs.length - 1][0] === 'me' ? '<div class="del">Delivered</div>' : ''}</div>
  <div class="bar">iMessage</div></body></html>`;
}
function whatsapp(msgs, dark, name) {
  const wall = dark ? '#0B141A' : '#ECE5DD', them = dark ? '#202C33' : '#fff', me = dark ? '#005C4B' : '#DCF8C6', ink = dark ? '#E9EDEF' : '#111', head = dark ? '#202C33' : '#075E54', meta = dark ? '#8696A0' : '#667781';
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  body{margin:0;background:${wall};color:${ink};font:16px Roboto,Helvetica,Arial,sans-serif;width:390px;height:844px;overflow:hidden}
  .status{background:${head};color:#fff;display:flex;justify-content:space-between;padding:8px 16px 2px;font-size:14px}
  .head{background:${head};color:#fff;display:flex;align-items:center;gap:10px;padding:8px 12px 10px}
  .av{width:38px;height:38px;border-radius:50%;background:#b0bec5}
  .nm{font-size:18px;font-weight:500}.on{font-size:12px;opacity:.8}
  .log{padding:10px 10px;display:flex;flex-direction:column;gap:6px}
  .b{max-width:75%;padding:6px 9px 4px;border-radius:8px;line-height:1.3;box-shadow:0 1px .5px rgba(0,0,0,.13)}
  .t{float:right;font-size:11px;color:${meta};margin:6px 0 0 10px}
  .them{align-self:flex-start;background:${them}}
  .me{align-self:flex-end;background:${me}}
  .bar{position:absolute;bottom:10px;left:8px;right:60px;background:${dark ? '#202C33' : '#fff'};border-radius:22px;padding:10px 16px;color:${meta}}
  </style></head><body><div class="status"><span>9:41</span><span>LTE 82%</span></div>
  <div class="head"><span>&larr;</span><div class="av"></div><div><div class="nm">${esc(name)}</div><div class="on">online</div></div></div>
  <div class="log">${msgs.map(([w, t], i) => `<div class="b ${w}">${esc(t)}<span class="t">9:${String(30 + i).padStart(2, '0')} PM${w === 'me' ? ' ✓✓' : ''}</span></div>`).join('')}</div>
  <div class="bar">Message</div></body></html>`;
}

function words(s) { return String(s).toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter(Boolean); }
function close(a, b) { const A = words(a), B = words(b); if (!A.length || !B.length) return 0; let c = 0; A.forEach(w => { if (B.includes(w)) c++; }); return c / Math.max(A.length, B.length); }

const CASES = [
  { tag: 'imessage-light', make: m => imessage(m, false, 'Alex'), msgs: [CHAT.slice(0, 6)], name: 'Alex' },
  { tag: 'imessage-dark', make: m => imessage(m, true, 'Alex'), msgs: [CHAT.slice(0, 6)], name: 'Alex' },
  { tag: 'whatsapp-light', make: m => whatsapp(m, false, 'Mom'), msgs: [CHAT.slice(0, 6)], name: 'Mom' },
  { tag: 'whatsapp-dark', make: m => whatsapp(m, true, 'Mom'), msgs: [CHAT.slice(0, 6)], name: 'Mom' },
  { tag: 'imessage-two-overlapping', make: m => imessage(m, false, 'Alex'), msgs: [CHAT.slice(0, 6), CHAT.slice(3, 10)], name: 'Alex', want: CHAT }
];

(async () => {
  const b = await chromium.launch();
  // 1. render the fake screenshots
  const shot = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  for (const c of CASES) {
    c.files = [];
    for (let i = 0; i < c.msgs.length; i++) {
      await shot.setContent(c.make(c.msgs[i]));
      const f = path.join(OUT, c.tag + '-' + (i + 1) + '.png');
      await shot.screenshot({ path: f });
      c.files.push(f);
    }
  }
  await shot.close();
  // 2. read them on the Reader page, at phone and desktop sizes
  for (const [w, h] of [[390, 844], [1280, 800]]) {
    const p = await b.newPage({ viewport: { width: w, height: h } });
    const pageErrs = []; p.on('pageerror', e => pageErrs.push(e.message));
    const requests = []; p.on('request', r => requests.push(r.url()));
    await p.goto('http://localhost:' + PORT + '/conversation-reader.html'); await p.waitForLoadState('load');
    ok(/never uploaded/.test(await p.textContent('.cr-shots-private')), `${w}: privacy line missing`);
    ok(!requests.some(u => /tesseract/.test(u)), `${w}: the OCR files load before anyone picks a screenshot`);
    for (const c of (w === 390 ? CASES : CASES.slice(0, 1))) {
      await p.evaluate(() => { const r = document.getElementById('cr-review'); if (r) r.innerHTML = ''; });
      await p.setInputFiles('#cr-shot', c.files);
      await p.waitForSelector('#cr-rv-list li', { timeout: 240000 });
      const got = await p.evaluate(() => ({
        them: document.getElementById('cr-rv-them').value,
        rows: [...document.querySelectorAll('#cr-rv-list li')].map(li => ({ me: li.classList.contains('is-me'), text: li.querySelector('textarea').value }))
      }));
      const want = c.want || c.msgs[0];
      ok(got.them === c.name, `${w} ${c.tag}: their name "${got.them}" (want ${c.name})`);
      let found = 0, sided = 0;
      want.forEach(([who, t]) => {
        const best = got.rows.map(r => [close(r.text, t), r]).sort((a, b2) => b2[0] - a[0])[0];
        if (best && best[0] >= 0.7) { found++; if (best[1].me === (who === 'me')) sided++; }
        else errs.push(`  (${c.tag}: not found "${t}")`);
      });
      ok(found >= want.length - 1, `${w} ${c.tag}: found ${found} of ${want.length} messages: ${got.rows.map(r => (r.me ? '> ' : '< ') + r.text).join(' | ')}`);
      ok(sided >= found - 0 && sided >= want.length - 1, `${w} ${c.tag}: ${sided} of ${found} on the right side`);
      ok(got.rows.length <= want.length + 1, `${w} ${c.tag}: ${got.rows.length} rows for ${want.length} messages (duplicates or furniture?)`);
      ok(!got.rows.some(r => /Delivered|iMessage|online|\b9:\d\d\b|82%|Today/.test(r.text)), `${w} ${c.tag}: chat furniture in the rows: ${got.rows.map(r => r.text).join(' | ')}`);
      await p.screenshot({ path: path.join(OUT, 'review-' + w + '-' + c.tag + '.png'), fullPage: false });
    }
    // 3. fix a name, then read it: the Reader opens with the conversation and doesn't ask who you are
    await p.fill('#cr-rv-me', 'Sam');
    await p.click('#cr-rv-go');
    await p.waitForSelector('.cr-summary, .cr-thread, #cr-s3', { timeout: 20000 });
    const readerText = await p.evaluate(() => document.getElementById('cr-out').innerText);
    ok(/Alex/.test(readerText) && !/Which one is you\?/.test(readerText), `${w}: the Reader should read the checked conversation straight away`);
    ok(/^Sam: /m.test(await p.$eval('#cr-input', e => e.value)), `${w}: the checked text should be in the box, with names`);
    ok(await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth) <= 0, `${w}: horizontal overflow`);
    ok(!requests.some(u => !/^http:\/\/localhost/.test(u) && !/^(data|blob):/.test(u) && /tesseract|traineddata/.test(u)), `${w}: OCR files must come from this site`);
    await p.screenshot({ path: path.join(OUT, 'reader-' + w + '.png'), fullPage: false });
    ok(!pageErrs.length, `${w}: page errors: ${pageErrs.join(' | ')}`);
    await p.close();
  }
  await b.close();
  console.log('screenshots in ' + OUT);
  errs.forEach(e => console.log('FAIL ' + e));
  console.log(`Screenshot import: ${pass} checks passed, ${fail} failed`);
  process.exitCode = fail ? 1 : 0;
})();
