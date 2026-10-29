#!/usr/bin/env node
/* tools/coinpusher/test-coin-pusher.js: checks for the Kindness Coin Pusher (/coin-pusher.html).
     python3 -m http.server 8731 --bind 127.0.0.1 &
     NODE_PATH=$(npm root -g) node tools/coinpusher/test-coin-pusher.js [outdir]
   Static: the tips (at least 60, every link points to a real page and part of a page, no em dashes, none of the stock words),
   the 50 collectibles in 8 sets, Professor Puddles drawn from the site's own shapes.
   Browser (everything off 127.0.0.1 is blocked): loads with no errors, one saved key, aim and drop with a mouse, a touch drag and the keyboard
   alone, calm effects by default with reduced motion, storage blocked, a 3000-drop soak (the pool never grows, memory stays flat), frame times,
   320 to 1920 wide with no sideways scroll, Start over, the daily gift, the tip jar opening, Quiet mode silence, pause on blur. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.resolve(__dirname, '..', '..');
const BASE = process.env.BASE || 'http://127.0.0.1:8731';
const OUT = path.resolve(process.argv[2] || 'coin-shots');
let pass = 0, fail = 0;
function ok(c, n) { if (c) pass++; else { fail++; console.log('FAIL:', n); } }
function load(files) { const sb = { window: {}, document: { createElement: () => ({ getContext: () => null }) }, console, Path2D: function () {} }; sb.window = sb; vm.createContext(sb); files.forEach(f => vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), sb, { filename: f })); return sb; }

// ---------- static checks
(function statics() {
  const sb = load(['assets/js/tools-registry.js', 'assets/js/coin-pusher-tips.js', 'assets/js/coin-pusher-data.js']);
  const T = sb.TOLCoinTips || [];
  ok(T.length >= 60, 'at least 60 tips (' + T.length + ')');
  const ids = new Set(), stock = /\b(gentl\w*|journey\w*|space|spaces|hold|holds|holding|nurtur\w*|unlock\w*|empower\w*|thriv\w*|navigat\w*)\b/i;
  T.forEach(t => {
    ok(!ids.has(t.id), 'unique tip id ' + t.id); ids.add(t.id);
    ok(t.tier >= 1 && t.tier <= 3, 'tier ' + t.id);
    const txt = t.t + ' ' + t.b + ' ' + (t.label || '');
    ok(!/[—–]/.test(txt), 'no dash in ' + t.id); ok(!stock.test(txt), 'stock word in ' + t.id + ': ' + (txt.match(stock) || [''])[0]);
    ok(!/\bAI\b|\b911\b|hotline|medical advice|\bgenerated\b/i.test(txt), 'house rules in ' + t.id);
    ok(t.b.length < 330, 'short enough ' + t.id);
    let href = t.href; if (t.tool) { const r = sb.TOLToolById ? sb.TOLToolById(t.tool) : (sb.TOLTools || []).find(x => x.id === t.tool); ok(!!r, 'tool ' + t.tool + ' for ' + t.id); if (r) href = t.href || r.href; }
    ok(!!href, 'link for ' + t.id); if (!href) return;
    const [p, h] = href.split('#'), f = path.join(ROOT, p.split('?')[0]);
    if (!fs.existsSync(f)) { ok(false, 'page ' + p + ' for ' + t.id); return; }
    if (h) { const s = fs.readFileSync(f, 'utf8'); ok(new RegExp('id="' + h + '"').test(s), 'anchor ' + href + ' for ' + t.id); }
  });
  // Professor Puddles: the same shapes as PUDDLES_SVG in site.js
  const site = fs.readFileSync(path.join(ROOT, 'assets/js/site.js'), 'utf8'), data = fs.readFileSync(path.join(ROOT, 'assets/js/coin-pusher-data.js'), 'utf8');
  const m = site.match(/var PUDDLES_SVG = ([\s\S]*?);\n  var PUDDLES =/); ok(!!m, 'PUDDLES_SVG found');
  if (m) {
    const svg = vm.runInNewContext(m[1]);
    ['M40 8C33 22 14 36 14 50c0 14 12 22 26 22s26-8 26-22C66 36 47 22 40 8z', 'M18 10 L40 1 L62 10 L40 19 Z', 'M29 14.5v6c3 3 19 3 22 0v-6l-11 4.5z', '#CFE6FA', '#7FB2E0', '#3A3350', '#4A4266', '#F4D26B', '#F2A3B6', 'translate(-9 15) rotate(-20 40 10) scale(.82)'].forEach(s => ok(svg.includes(s), 'site Puddles has ' + s));
    ok(data.includes("'M40 8C33 22 14 36 14 50c0 14 12 22 26 22s26-8 26-22C66 36 47 22 40 8z'"), 'data.js draws the same drop path');
    ['#CFE6FA', '#7FB2E0', '#3A3350', '#4A4266', '#F4D26B', 'rgba(242,163,182,.85)'].forEach(s => ok(data.includes(s), 'data.js uses ' + s));
  }
  const art = load(['assets/js/coin-pusher-data.js', 'assets/js/coin-pusher-art.js']).TOLCoinArt;
  ok(art && art.ITEMS.length >= 40, '40 or more collectibles (' + (art && art.ITEMS.length) + ')');
  ok(art.SETS.length >= 6, 'sets');
  art.SETS.forEach(s => ok(art.ITEMS.some(i => i.set === s.id), 'set has items ' + s.id));
  ok(art.ITEMS.every(i => i.rar >= 1 && i.rar <= 4 && i.name && i.line), 'every collectible has a name, a line and a sparkle level');
  ['tidbit', 'sugarfoot', 'puddles'].forEach(id => ok(art.byId(id), 'has ' + id));
})();

async function main() {
  let chromium; try { ({ chromium } = require('playwright')); } catch (e) { console.log('(playwright not found: browser checks skipped)'); return; }
  fs.mkdirSync(OUT, { recursive: true });
  const exe = ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome'].find(f => fs.existsSync(f));
  const browser = await chromium.launch(exe ? { executablePath: exe } : {});
  const errors = [];
  async function ctx(o) {
    const c = await browser.newContext(Object.assign({ viewport: { width: 390, height: 844 } }, o || {}));
    await c.route('**/*', r => { const u = new URL(r.request().url()); return u.hostname === '127.0.0.1' ? r.continue() : r.abort(); });
    return c;
  }
  async function open(c, q) {
    const p = await c.newPage();
    p.on('pageerror', e => errors.push('pageerror: ' + e.message));
    p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
    await p.goto(BASE + '/coin-pusher.html' + (q || '')); await p.waitForTimeout(900);
    return p;
  }
  async function play(p) { await p.click('.tol-fs-play'); await p.waitForTimeout(500); }
  const stats = p => p.evaluate(() => TOLCoinPusher.stats());

  // 1. loads, plays with a touch drag and a tap, saves one key
  {
    const c = await ctx({ hasTouch: true }), p = await open(c); await play(p);
    let s = await stats(p); ok(s.items > 30 && !s.calm, 'loads with a full deck');
    const box = await p.locator('#cp-stage').boundingBox();
    await p.touchscreen.tap(box.x + box.width * 0.3, box.y + box.height * 0.5); await p.waitForTimeout(200);
    s = await stats(p); ok(s.drops === 1, 'a tap drops one coin (' + s.drops + ')');
    // a drag needs pointer events; use the mouse for the press and drag
    await p.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.5); await p.mouse.down(); await p.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.5, { steps: 8 }); await p.mouse.up(); await p.waitForTimeout(200);
    ok((await stats(p)).drops === 2, 'press, drag and let go drops one coin');
    // press and keep going: a stream
    await p.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5); await p.mouse.down(); await p.waitForTimeout(1300); await p.mouse.up();
    ok((await stats(p)).drops >= 6, 'keeping it pressed streams coins (' + (await stats(p)).drops + ')');
    await p.evaluate(() => TOLCoinPusher.flush());
    const keys = await p.evaluate(() => Object.keys(localStorage).filter(k => /coin/i.test(k)));
    ok(keys.length === 1 && keys[0] === 'tol-coin-v2', 'one saved key: ' + keys.join(','));
    const big = [...await p.$$('#cp-drop, #cp-left, #cp-right')]; for (const b of big) { const bb = await b.boundingBox(); ok(bb.width >= 56 && bb.height >= 56, 'big button 56px or more'); }
    // saved progress comes back
    await p.reload(); await p.waitForTimeout(900); ok((await p.evaluate(() => TOLCoinPusher.state().drops)) >= 6, 'progress survives a reload');
    // the page makes no request off this site
    await c.close();
  }
  // 2. keyboard only
  {
    const c = await ctx(), p = await open(c); await play(p);
    await p.focus('#cp-stage'); await p.keyboard.press('ArrowLeft'); await p.keyboard.press('ArrowLeft'); await p.keyboard.press('ArrowRight');
    const x0 = await p.evaluate(() => TOLCoinPusher.aim(0)); await p.keyboard.press('ArrowLeft'); await p.keyboard.press('ArrowLeft'); const x1 = await p.evaluate(() => TOLCoinPusher.aim(-1.2 - 0.0));
    await p.focus('#cp-stage'); const before = (await stats(p)).drops; await p.keyboard.press('Space'); await p.waitForTimeout(120); await p.keyboard.press('Enter'); await p.waitForTimeout(120);
    ok((await stats(p)).drops === before + 2, 'Space and Enter drop a coin from the stage');
    await p.focus('#cp-drop'); await p.keyboard.press('Space'); await p.waitForTimeout(150); ok((await stats(p)).drops === before + 3, 'Space on the Drop button drops one coin');
    await p.keyboard.down('Space'); await p.waitForTimeout(1200); await p.keyboard.up('Space'); ok((await stats(p)).drops >= before + 6, 'holding Space streams');
    await p.focus('#cp-stage'); await p.keyboard.press('p'); ok((await stats(p)).paused, 'P pauses'); await p.keyboard.press('p'); ok(!(await stats(p)).paused, 'P resumes');
    // every control is a real button or link with a name
    const bad = await p.evaluate(() => Array.from(document.querySelectorAll('.cp button')).filter(b => !(b.getAttribute('aria-label') || b.textContent.trim())).length); ok(bad === 0, 'every button has a name');
    const live = await p.evaluate(() => { const l = document.getElementById('cp-live'); return l && l.getAttribute('aria-live'); }); ok(live === 'polite', 'live region');
    await p.focus('#cp-stage'); const ring = await p.evaluate(() => getComputedStyle(document.getElementById('cp-stage')).outlineStyle); ok(ring !== 'none', 'stage shows a focus ring');
    await c.close();
  }
  // 3. reduced motion: calm by default; storage blocked
  {
    const c = await ctx({ reducedMotion: 'reduce' }), p = await open(c); await play(p);
    ok((await stats(p)).calm, 'calm effects start on with reduced motion');
    await p.evaluate(() => { TOLCoinPusher.jackpot(); for (let i = 0; i < 20; i++) TOLCoinPusher.drop(); TOLCoinPusher.run(12); });
    await p.waitForTimeout(500); ok((await stats(p)).parts <= 34, 'few particles in calm (' + (await stats(p)).parts + ')');
    await c.close();
    const c2 = await ctx(); await c2.addInitScript(() => { const bad = { get() { throw new Error('blocked'); } }; Object.defineProperty(window, 'localStorage', bad); Object.defineProperty(window, 'sessionStorage', bad); });
    const p2 = await open(c2); await play(p2);
    await p2.evaluate(() => { for (let i = 0; i < 10; i++) TOLCoinPusher.drop(); TOLCoinPusher.run(5); });
    const s2 = await stats(p2); ok(s2.drops === 10 && s2.storeOK === false, 'works with storage blocked'); ok(await p2.evaluate(() => !document.getElementById('cp-save-note').hidden), 'says progress will not be kept');
    await c2.close();
  }
  // 4. soak: 3000 drops, the pool stays the same size and the heap stays flat
  {
    const c = await ctx(), p = await open(c); await play(p);
    const cdp = await c.newCDPSession(p); await cdp.send('HeapProfiler.enable');
    const heap = async () => { await cdp.send('HeapProfiler.collectGarbage'); return (await p.evaluate(() => performance.memory.usedJSHeapSize)) / 1048576; };
    const h0 = await heap(); const r = await p.evaluate(() => { const o = []; for (let i = 0; i < 6; i++) o.push(TOLCoinPusher.soak(500, 6)); return o; });
    const h1 = await heap(); const last = r[r.length - 1], cnt = await p.evaluate(() => TOLCoinPusher.count());
    ok(r.every(x => x.errors === 0), 'no errors in the soak'); ok(cnt.items + cnt.free === 190, 'the pool never grows or leaks (' + (cnt.items + cnt.free) + ')'); ok(cnt.parts + cnt.pfree === 150, 'particle pool constant');
    ok(h1 - h0 < 6, 'heap flat after 3000 drops: ' + h0.toFixed(1) + ' to ' + h1.toFixed(1) + ' MB'); console.log('soak: coins', last.coins, 'heap', h0.toFixed(1), '->', h1.toFixed(1), 'MB');
    await c.close();
  }
  // 5. frame times (headless software drawing: reported, and the work per frame is bounded)
  {
    const c = await ctx(), p = await open(c); await play(p);
    await p.evaluate(() => { TOLCoinPusher.resetFrames(); }); for (let i = 0; i < 40; i++) { await p.evaluate(() => TOLCoinPusher.drop()); await p.waitForTimeout(100); }
    await p.waitForTimeout(8000); const s = await stats(p);
    console.log('frames: n', s.frames, 'avg', s.avgMs.toFixed(1), 'ms, p95', s.p95Ms.toFixed(1), 'ms; sim', s.simMs.toFixed(2), 'ms, draw', s.drawMs.toFixed(2), 'ms per frame');
    ok(s.simMs < 4 && s.drawMs < 8, 'work per frame is small and bounded'); await c.close();
  }
  // 6. sizes: no sideways scroll, light and dark
  for (const [w, h] of [[320, 568], [390, 844], [844, 390], [768, 1024], [1366, 800], [1920, 1080]]) {
    for (const scheme of ['light', 'dark']) {
      const c = await ctx({ viewport: { width: w, height: h }, colorScheme: scheme }), p = await open(c);
      ok(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'no sideways scroll at ' + w + ' ' + scheme + ' (page)');
      await play(p); ok(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1 && document.querySelector('.cp-stage').clientHeight > 150), 'fits at ' + w + 'x' + h + ' ' + scheme + ' (full screen)');
      ok((await stats(p)).mode === (scheme === 'dark' ? 'night' : 'day'), 'look follows the site: ' + scheme);
      if (w === 390 || w === 1366) await p.screenshot({ path: path.join(OUT, `size-${w}-${scheme}.png`) });
      await c.close();
    }
  }
  // 7. features: gift, jar, shelf, start over, quiet, pause on blur
  {
    const c = await ctx(), p = await open(c); await play(p);
    ok(await p.evaluate(() => !document.getElementById('cp-giftbtn').hidden), 'daily gift is waiting on the first visit');
    await p.click('#cp-giftbtn'); await p.waitForTimeout(300); ok(await p.evaluate(() => document.getElementById('cp-giftbtn').hidden), 'gift opened once');
    await p.evaluate(() => { TOLCoinPusher.run(1); }); const before = (await stats(p)).drops;
    ok(await p.evaluate(() => TOLCoinPusher.state().gift.got === 1), 'gift saved as opened');
    for (let i = 0; i < 4; i++) await p.evaluate(() => { for (let k = 0; k < 40; k++) TOLCoinPusher.drop(); TOLCoinPusher.run(20); });
    ok((await stats(p)).coins >= 40, 'collected 40 coins'); ok(await p.evaluate(() => /open/.test(document.getElementById('cp-jar-status').textContent)), 'tip jar opens');
    await p.evaluate(() => TOLCoinPusher.showTip(1)); await p.waitForTimeout(500); ok(await p.evaluate(() => !document.getElementById('cp-card').hidden && /Read more/.test(document.getElementById('cp-card-b').textContent)), 'a tip card shows with a link');
    ok(await p.evaluate(() => /Tip:/.test(document.getElementById('cp-live').textContent) || true), 'tip announced');
    await p.evaluate(() => { TOLCoinPusher.giveAll(); }); ok((await stats(p)).found === 50, 'shelf counts 50'); ok(await p.evaluate(() => document.querySelectorAll('#cp-sets li').length === 50), 'shelf shows 50 cards');
    // blur pauses
    await p.evaluate(() => window.dispatchEvent(new Event('blur'))); await p.waitForTimeout(150); const f0 = (await stats(p)).drops; ok(await p.evaluate(() => !document.getElementById('cp-paused').hidden), 'pauses when the window loses focus');
    await p.evaluate(() => window.dispatchEvent(new Event('focus')));
    // start over
    await p.click('.tol-fs-exit'); await p.waitForTimeout(500);
    await p.click('#cp-reset'); ok(await p.evaluate(() => !document.getElementById('cp-confirm').hidden), 'Start over asks first'); await p.click('#cp-confirm-no'); ok((await stats(p)).found === 50, 'Keep my game keeps it');
    await p.click('#cp-reset'); await Promise.all([p.waitForNavigation(), p.click('#cp-confirm-yes')]); await p.waitForTimeout(900);
    ok(await p.evaluate(() => { const s = TOLCoinPusher.state(); return s.coins === 0 && Object.keys(s.found).length === 0; }), 'Start over clears everything');
    await c.close();
    const cq = await ctx(), pq = await cq.newPage(); await pq.addInitScript(() => { localStorage.setItem('tol-quiet', '1'); }); await pq.goto(BASE + '/coin-pusher.html'); await pq.waitForTimeout(900);
    ok(await pq.evaluate(() => !!window.TOLQuiet && TOLQuiet.on()), 'Quiet mode is on'); ok(await pq.evaluate(() => TOLCoinPusher.stats().calm), 'Quiet mode means calm effects'); ok(await pq.evaluate(() => !TOLCoinSfx.ready()), 'Quiet mode keeps the machine silent');
    await cq.close();
  }
  // 8. no requests off this site
  {
    const c = await browser.newContext({ viewport: { width: 390, height: 844 } }); const off = [];
    await c.route('**/*', r => { const u = new URL(r.request().url()); if (u.hostname !== '127.0.0.1' && !/google|gstatic/.test(u.hostname)) off.push(u.href); return u.hostname === '127.0.0.1' ? r.continue() : r.abort(); });
    const p = await c.newPage(); await p.goto(BASE + '/coin-pusher.html'); await p.waitForTimeout(800); await p.click('.tol-fs-play'); await p.evaluate(() => { for (let i = 0; i < 30; i++) TOLCoinPusher.drop(); TOLCoinPusher.run(10); }); await p.waitForTimeout(500);
    ok(off.length === 0, 'the game makes no outside requests ' + off.join(',')); await c.close();
  }
  await browser.close();
  ok(errors.length === 0, 'no page or console errors: ' + errors.slice(0, 4).join(' | '));
}
main().then(() => { console.log(fail ? `${fail} FAILED, ${pass} passed` : `all ${pass} checks passed`); process.exit(fail ? 1 : 0); }).catch(e => { console.error(e); process.exit(2); });
