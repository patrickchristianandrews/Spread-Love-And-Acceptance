#!/usr/bin/env node
/* epub_images.js: turns the book's SVG pictures into PNG files for the Kindle ebooks (epub13).

   Called by tools/book/build_epub.py; you don't need to run it yourself:
       NODE_PATH=$(npm root -g) node tools/book/epub_images.js jobs.json

   jobs.json: { "fontCss": "@font-face {...}", "jobs": [ { "out": "/abs/x.png", "svg": "<svg ...>", "width": 540,
                "scale": 2, "bg": "white" | "circle" } ] }
   "white" bakes a white card behind the picture, so it stays readable when a Kindle shows white text on black.
   "circle" puts a character badge on a small white disc and leaves the corners transparent.
   The figures' text is set in the book's own fonts (Lora, Fraunces), fetched from Google Fonts as the print
   PDFs do. Without a network the browser falls back to Georgia/serif and says so. Every other request is blocked. */
const fs = require('fs');
const { chromium } = require('playwright');

(async () => {
  const spec = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  let browser;
  try { browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || '/opt/pw-browsers/chromium' }); }
  catch (e) { browser = await chromium.launch(); }
  const fonts = new Map();
  let fontFail = 0;
  const contexts = new Map();
  async function contextFor(scale) {
    if (contexts.has(scale)) return contexts.get(scale);
    const ctx = await browser.newContext({ deviceScaleFactor: scale });
    await ctx.route('**/*', async route => {
      const u = route.request().url();
      if (/^https:\/\/fonts\.gstatic\.com\//.test(u)) {
        if (fonts.has(u)) return route.fulfill(fonts.get(u));
        try {
          const r = await route.fetch({ timeout: 20000 });
          if (r.ok()) { const v = { status: 200, headers: r.headers(), body: await r.body() }; fonts.set(u, v); return route.fulfill(v); }
        } catch (e) { /* offline: fall back to Georgia/serif */ }
        fontFail++;
        return route.abort();
      }
      if (u.startsWith('data:') || u === 'about:blank') return route.continue();
      return route.abort();
    });
    contexts.set(scale, ctx);
    return ctx;
  }
  let done = 0;
  for (const j of spec.jobs) {
    const page = await (await contextFor(j.scale || 2)).newPage();
    const pad = j.bg === 'white' ? Math.round(j.width * 0.03) : 0;
    const box = j.bg === 'circle'
      ? `width:${j.width}px;height:${j.width}px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;`
      : `width:${j.width}px;background:${j.bg === 'white' ? '#fff' : 'transparent'};padding:${pad}px;box-sizing:content-box;`;
    const inner = j.bg === 'circle' ? `width:${Math.round(j.width * 0.82)}px;height:${Math.round(j.width * 0.82)}px;` : 'width:100%;';
    const html = `<!doctype html><html><head><meta charset="utf-8"><style>${spec.fontCss || ''}
      html,body{margin:0;padding:0;background:transparent;}
      #x{${box}} #i{${inner}} #i svg{display:block;width:100%;height:${j.bg === 'circle' ? '100%' : 'auto'};}
      </style></head><body><div id="x"><div id="i">${j.svg}</div></div></body></html>`;
    await page.setViewportSize({ width: Math.ceil(j.width + 2 * pad) + 20, height: 600 });
    await page.setContent(html, { waitUntil: 'load' });
    try { await page.evaluate(async () => { await Promise.all([...document.fonts].map(f => f.load().catch(() => null))); await document.fonts.ready; }); } catch (e) {}
    await (await page.$('#x')).screenshot({ path: j.out, omitBackground: j.bg !== 'white' });
    await page.close();
    done++;
  }
  await browser.close();
  console.log(`epub_images: ${done} pictures` + (fontFail ? ` (${fontFail} font files could not be fetched; Georgia/serif used instead)` : ''));
})().catch(e => { console.error('epub_images: ' + (e && e.stack || e)); process.exit(1); });
