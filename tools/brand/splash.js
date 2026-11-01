#!/usr/bin/env node
/* splash.js: the iPhone and iPad start-up pictures (assets/icons/splash/*.png), redrawn from the launch cover itself
   (assets/js/launch-pups.js with TOLLaunchPupsManual: its first frame, the logo tile and the name in the middle).
   Run after the logo changes:  python3 -m http.server 8695 --bind 127.0.0.1 &   NODE_PATH=$(npm root -g) node tools/brand/splash.js
   A size W x H is drawn at device pixel ratio 2 on iPads and the older iPhones, 3 on the rest. */
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..', '..'), PORT = process.env.SPLASH_PORT || '8695';
const DIR = path.join(ROOT, 'assets/icons/splash');
const TWO = new Set(['750x1334', '828x1792', '1488x2266', '1536x2048', '1620x2160', '1640x2360', '1668x2224', '1668x2388', '2048x2732', '2064x2752']);
(async () => {
  const b = await chromium.launch({ executablePath: fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined });
  for (const f of fs.readdirSync(DIR).filter(n => /^splash-\d+x\d+\.png$/.test(n))) {
    const [W, H] = f.match(/(\d+)x(\d+)/).slice(1).map(Number), key = W + 'x' + H, r = TWO.has(key) ? 2 : 3;
    const ctx = await b.newContext({ viewport: { width: Math.round(W / r), height: Math.round(H / r) }, deviceScaleFactor: r });
    const p = await ctx.newPage();
    await p.goto('http://127.0.0.1:' + PORT + '/about.html', { waitUntil: 'domcontentloaded' });   // any same-origin page; the cover is built by hand below
    await p.setContent('<!doctype html><html><head><link rel="stylesheet" href="http://127.0.0.1:' + PORT + '/assets/css/launch-pups.css"><style>html,body{margin:0;height:100%}</style></head><body></body></html>');
    await p.evaluate(() => { window.TOLLaunchPupsManual = true; });
    await p.addScriptTag({ url: 'http://127.0.0.1:' + PORT + '/assets/js/pups.js' });
    await p.addScriptTag({ url: 'http://127.0.0.1:' + PORT + '/assets/js/launch-pups.js' });
    await p.evaluate(async (port) => {
      const c = window.TOLLaunchPups.build({ still: false });
      c.el.querySelector('img').src = 'http://127.0.0.1:' + port + '/assets/img/logo-mark.svg';
      document.body.appendChild(c.el); c.el.classList.add('is-in');
      await new Promise(res => { const im = c.el.querySelector('img'); if (im.complete) res(); else { im.onload = res; im.onerror = res; } });
      await document.fonts.ready; c.drawAt(0);
    }, PORT);
    await p.waitForTimeout(300);
    await p.screenshot({ path: path.join(DIR, f) });
    await ctx.close();
    console.log(f, '@' + r);
  }
  await b.close();
})();
