#!/usr/bin/env node
/* md_to_pdf.js <in.html> <out.pdf>: print a local HTML file to a letter-size PDF with Playwright Chromium (the adult coloring book KDP listing).
   Only local files load. Fonts are the OFL files in tools/kids/fonts (the HTML points at them with file: URLs). */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
(async () => {
  const [src, out] = process.argv.slice(2);
  const browser = await chromium.launch({ executablePath: fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined });
  const page = await browser.newPage();
  await page.route('**/*', r => (r.request().url().startsWith('file://') ? r.continue() : r.abort()));
  await page.goto('file://' + path.resolve(src), { waitUntil: 'load' });
  await page.evaluate(async () => { await Promise.all([...document.fonts].map(f => f.load().catch(() => null))); await document.fonts.ready; });
  await page.pdf({ path: out, format: 'Letter', printBackground: true, margin: { top: '0.7in', bottom: '0.8in', left: '0.7in', right: '0.7in' },
    displayHeaderFooter: true, headerTemplate: '<span></span>',
    footerTemplate: '<div style="width:100%;font-size:8px;text-align:center;color:#666;font-family:sans-serif">Color and Breathe, KDP listing &middot; page <span class="pageNumber"></span> of <span class="totalPages"></span></div>' });
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
