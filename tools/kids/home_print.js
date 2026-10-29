#!/usr/bin/env node
/* home_print.js: the free website copies of the three coloring books, pictures only (owner, Oct 29 2026).
   The paperbacks keep a blank page behind every picture (markers soak through). Someone printing at home chooses
   their own paper, so the website copies leave the blank backs out and say "print on one side" instead.

   Prints the same print sources as the paperbacks (book/kids/src/coloring-younger.html, coloring-older.html and
   book/adult/src/coloring-adult.html), with two changes made in the page before printing:
     - every page with nothing on it is taken out;
     - the lines that promise a blank back are reworded for home printing.
   Writes book/kids/coloring-younger-home.pdf, book/kids/coloring-older-home.pdf and book/adult/coloring-adult-home.pdf.
   The paperback files (coloring-younger.pdf and the rest) are not touched.

   Needs a local server on the site, started from the repo root:
     python3 -m http.server 8673 --bind 127.0.0.1 &
     NODE_PATH=$(npm root -g) node tools/kids/home_print.js
   Run it again after rebuilding a coloring book. */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..', '..');
const PORT = process.env.KIDS_PORT || '8673';
const BOOKS = [
  { src: 'book/kids/src/coloring-younger.html', out: 'book/kids/coloring-younger-home.pdf', title: 'Color with Tidbit and Sugarfoot' },
  { src: 'book/kids/src/coloring-older.html', out: 'book/kids/coloring-older-home.pdf', title: 'Color and Calm with Tidbit and Sugarfoot' },
  { src: 'book/adult/src/coloring-adult.html', out: 'book/adult/coloring-adult-home.pdf', title: 'Color and Breathe' }
];
// [what the paperback says, what the home copy says]
const SWAPS = [
  ['Every picture has a blank page behind it, so markers stay put, and a sheet of paper under the page helps too.',
   'Print the pages on one side of the paper so markers stay put, and a sheet of paper under the page helps too.'],
  ['Every design has a blank page behind it, so markers will not bleed into the next one.',
   'Print the designs on one side of the paper, so markers will not bleed into the next one.'],
  ['The back of every picture is blank',
   'Print on one side of the paper'],
  [', so markers will not soak through to the next one.',
   ', so markers will not soak through to the next picture.']
];

function pageCount(f) { const m = /Pages:\s+(\d+)/.exec(execFileSync('pdfinfo', [f]).toString()); return m ? +m[1] : 0; }

(async () => {
  const browser = await chromium.launch({ executablePath: fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined });
  let bad = 0;
  for (const b of BOOKS) {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    page.on('pageerror', e => console.log('  page error:', e.message));
    await page.route('**/*', r => (r.request().url().startsWith('http://127.0.0.1:' + PORT + '/') ? r.continue() : r.abort()));
    await page.goto(`http://127.0.0.1:${PORT}/${b.src}`, { waitUntil: 'load', timeout: 180000 });
    await page.evaluate(async () => { await Promise.all([...document.fonts].map(f => f.load().catch(() => null))); await document.fonts.ready; });
    const r = await page.evaluate(swaps => {
      const pages = [...document.querySelectorAll('section.pg')];
      let removed = 0, swapped = 0;
      pages.forEach(p => {
        const empty = !p.textContent.trim() && !p.querySelector('svg, img, canvas, picture, object');
        if (empty) { p.remove(); removed++; }
      });
      const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      for (let n = walk.nextNode(); n; n = walk.nextNode()) {
        swaps.forEach(([from, to]) => { if (n.nodeValue.includes(from)) { n.nodeValue = n.nodeValue.split(from).join(to); swapped++; } });
      }
      const left = document.body.textContent.match(/blank page behind|back of every picture is blank/gi) || [];
      return { pages: pages.length, removed, swapped, left: left.length };
    }, SWAPS);
    const out = path.join(ROOT, b.out);
    fs.writeFileSync(out, await page.pdf({ preferCSSPageSize: true, printBackground: true, displayHeaderFooter: false, tagged: false }));
    await ctx.close();
    try { execFileSync('python3', [path.join(__dirname, 'pdf_meta.py'), out, b.title, 'Christian']); } catch (e) { console.log('  pdf_meta failed:', e.message.split('\n')[0]); }
    const n = pageCount(out);
    if (r.left || !r.swapped || n !== r.pages - r.removed) { bad++; console.log('PROBLEM', b.out, JSON.stringify(r), 'printed', n); }
    console.log(b.out + ': ' + n + ' pages (' + r.removed + ' blank pages left out, ' + r.swapped + ' lines reworded), ' + (fs.statSync(out).size / 1048576).toFixed(1) + ' MB');
  }
  await browser.close();
  process.exit(bad ? 1 : 0);
})();
