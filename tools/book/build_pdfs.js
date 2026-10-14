#!/usr/bin/env node
/* build_pdfs.js: print the book's one-page packages to designed PDF books in book/pdf/, and write
   book/pdf/manifest.json (pages, size and where every chapter and index term landed), which
   tools/book/build_book.py shows on book/download.html and writes back into the packages' contents.

   Run from the repo root with a local server on the site:
     python3 tools/book/build_book.py
     python3 -m http.server 8142 --bind 127.0.0.1 &
     NODE_PATH=$(npm root -g) node tools/book/build_pdfs.js 8142            (all eight PDFs and sample.pdf)
     NODE_PATH=$(npm root -g) node tools/book/build_pdfs.js 8142 together   (just some of them; "sample" too)
     python3 tools/book/build_book.py        (puts the page counts, sizes and page numbers on the pages)

   How a book is made (the design is /assets/css/book-print.css):
   1. Open the package with the site's scripts held back (only the book, its stylesheets and Google Fonts load).
   2. Draw the "Put it to use" QR codes with the site's own encoder (/assets/js/share-kit.js, TOLShareKit.qr).
   3. Print once, read the text of each page (pdftotext, from poppler-utils) and find the invisible markers
      at each chapter, part, figure and back-matter section, and every page where an index term appears.
   4. Write the page numbers into the contents, the part openers, "This connects to" and the index, and print
      again until the numbers stop moving. Then take the markers out and print the final copy.

   Print structure (bookfixA): the interior is printed without the covers, so page 1 is the half-title (a
   right-hand page) and odd pages are rectos; the title page and each part opener are moved to a recto with a
   blank page where needed. The covers are printed separately (two pages: front, back). tools/book/pdf_finish.py
   (pypdf) then pads the interior to an even page count and writes:
     book/pdf/<book>.pdf                    the screen edition: front cover + interior + back cover, with
                                            bookmarks, the document title, and page labels that match the folios
     book/pdf/print/<book>-interior.pdf     the interior on its own, for a print shop (BOOK_PRINT_KIT=0 skips)
     book/pdf/print/<book>-cover.pdf        the front and back cover on their own
   The figures are inlined as SVG before printing, so their text is set in the book's own fonts.
*/
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright');

const PORT = process.argv[2] || '8142';
const ONLY = process.argv.slice(3);
const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.join(ROOT, 'book', 'pdf');
const NAMES = ['whole', 'for-yourself', 'together', 'understanding'];
const SITE = 'https://spreadloveandacceptance.com';
const FONTS = new Map();
const PRINT_KIT = process.env.BOOK_PRINT_KIT !== '0';
const PRINT_OUT = path.join(OUT, 'print');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'tol-book-'));

function pageTexts(buf) {
  const f = path.join(TMP, 'p.pdf');
  fs.writeFileSync(f, buf);
  const txt = execFileSync('pdftotext', ['-enc', 'UTF-8', f, '-'], { maxBuffer: 256 * 1024 * 1024 }).toString('utf8');
  const pages = txt.split('\f');
  if (pages.length && pages[pages.length - 1].trim() === '') pages.pop();
  return pages;
}
function pageCount(buf) {
  const f = path.join(TMP, 'c.pdf');
  fs.writeFileSync(f, buf);
  const m = /Pages:\s+(\d+)/.exec(execFileSync('pdfinfo', [f]).toString());
  return m ? +m[1] : 0;
}
const markText = k => 'zq' + k.toLowerCase().replace(/[^a-z0-9]/g, 'x') + 'qz';

// where each marker lands: { key: pageNumber }
function findMarks(pages, keys) {
  const map = {};
  pages.forEach((t, i) => {
    const flat = t.replace(/\s+/g, '');
    for (const k of keys) if (!(k in map) && flat.includes(markText(k))) map[k] = i + 1;
  });
  return map;
}

// pages where each index term appears, between the first chapter and the back matter
function indexPages(pages, terms, from, to, skip) {
  const out = {};
  for (const [key, rx, cs] of terms) {
    let re;
    try { re = new RegExp('(?<![A-Za-z])(?:' + rx + ')(?![A-Za-z])', cs ? 'g' : 'gi'); } catch (e) { continue; }
    const hits = [];
    for (let p = from; p <= to && p <= pages.length; p++) {
      if (skip.has(p)) continue;
      const t = pages[p - 1].replace(/-\n/g, '-').replace(/\s+/g, ' ');
      const n = (t.match(re) || []).length;
      if (n) hits.push([p, n]);
    }
    if (!hits.length) continue;
    // every page is listed (consecutive pages as a range); a word on very many pages keeps the pages that
    // say it at least twice, so the entry points to where the book dwells on it
    let keep = hits;
    if (hits.length > 30) { const k = hits.filter(h => h[1] >= 2); if (k.length >= 5) keep = k; }
    const nums = keep.map(h => h[0]);
    const parts = [];
    for (let i = 0; i < nums.length; i++) {
      let j = i;
      while (j + 1 < nums.length && nums[j + 1] === nums[j] + 1) j++;
      parts.push(j > i ? nums[i] + '–' + nums[j] : String(nums[i]));
      i = j;
    }
    out[key] = parts.join(', ');
  }
  return out;
}

async function render(page) {
  // Chromium sometimes fails a very long print when the machine is busy: wait and ask once more
  try { return await printPdf(page); } catch (e) { console.log('  print failed (%s), trying again', e.message.split('\n')[0]); await page.waitForTimeout(3000); return printPdf(page); }
}
function printPdf(page) {
  return page.pdf({ preferCSSPageSize: true, printBackground: true, displayHeaderFooter: false, outline: true, tagged: false });
}

async function makeBook(ctx, file, opts = {}) {
  const t0 = Date.now(), log = m => { if (process.env.BOOK_VERBOSE) console.log('  %s %ds %s', file, Math.round((Date.now() - t0) / 1000), m); };
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('  page error:', e.message));
  await page.route('**/*', async route => {
    const u = route.request().url();
    if (u.startsWith('http://127.0.0.1:' + PORT + '/')) {
      // hold back the site's own scripts: the print edition needs none of the widgets
      if (/\/assets\/js\//.test(u) && !/\/assets\/js\/share-kit\.js/.test(u)) return route.abort();
      return route.continue();
    }
    if (/^https:\/\/fonts\.(googleapis|gstatic)\.com\//.test(u)) {
      // fonts come once, are kept for the next books, and a slow answer is asked again (a missing font file
      // would print in a fallback face)
      if (FONTS.has(u)) return route.fulfill(FONTS.get(u));
      for (let i = 0; i < 4; i++) {
        try {
          const r = await route.fetch({ timeout: 30000 });
          if (r.ok()) { const v = { status: 200, headers: r.headers(), body: await r.body() }; FONTS.set(u, v); return route.fulfill(v); }
        } catch (e) {}
      }
      return route.abort();
    }
    return route.abort();
  });
  await page.goto(`http://127.0.0.1:${PORT}/book/${file}.html`, { waitUntil: 'load', timeout: 180000 });
  try { await page.evaluate(() => document.fonts && document.fonts.ready); } catch (e) {}
  log('loaded');
  await page.addScriptTag({ url: '/assets/js/share-kit.js' }).catch(() => page.addScriptTag({ path: path.join(ROOT, 'assets/js/share-kit.js') }));
  await page.emulateMedia({ media: 'print' });
  // the print stylesheet brings its own (static) font files: load every face before the first print,
  // or Chromium prints with a fallback font and the page numbers move later
  await page.evaluate(async () => {
    await Promise.all([...document.fonts].map(f => f.load().catch(() => null)));
    await document.fonts.ready;
  });
  const badFonts = await page.evaluate(() => [...document.fonts].filter(f => f.status !== 'loaded' && /U\+0-10FFFF/i.test(f.unicodeRange)).map(f => f.family + ' ' + f.weight + ' ' + f.style));
  if (badFonts.length) console.log('  warning: print fonts not loaded:', badFonts.join(', '));
  log('fonts');
  // the covers are printed on their own (a separate file for a print shop, and the outside of the screen
  // edition); the interior starts at the half-title on page 1
  const covers = await page.evaluate(() => {
    const out = [...document.querySelectorAll('.pe-cover, .pe-backcover')].map(el => el.outerHTML);
    document.querySelectorAll('.pe-cover, .pe-backcover').forEach(el => el.remove());
    const o = document.getElementById('pe-outline');
    return { html: out, meta: o ? JSON.parse(o.textContent) : {} };
  });
  // the figures go into the page as inline SVG, so their text is set in the book's fonts (an <img> can't use them)
  const inlined = await page.evaluate(async () => {
    let n = 0, k = 0;
    for (const img of [...document.querySelectorAll('figure.book-fig img[src$=".svg"]')]) {
      try {
        const txt = await (await fetch(img.getAttribute('src'))).text();
        const doc = new DOMParser().parseFromString(txt, 'image/svg+xml');
        const svg = doc.documentElement;
        if (!svg || svg.nodeName.toLowerCase() !== 'svg') continue;
        const pre = 'pesvg' + (++k) + '-';
        const ids = [...svg.querySelectorAll('[id]')].map(e => e.id);
        svg.querySelectorAll('[id]').forEach(e => { e.id = pre + e.id; });
        [svg, ...svg.querySelectorAll('*')].forEach(e => {
          for (const a of [...e.attributes]) {
            let v = a.value;
            if (v.includes('url(#')) v = v.replace(/url\(#([^)]+)\)/g, (m, id) => ids.includes(id) ? 'url(#' + pre + id + ')' : m);
            if (/(^|:)href$/.test(a.name) && v.startsWith('#') && ids.includes(v.slice(1))) v = '#' + pre + v.slice(1);
            if (/^aria-(labelledby|describedby)$/.test(a.name)) v = v.split(/\s+/).map(x => ids.includes(x) ? pre + x : x).join(' ');
            if (v !== a.value) e.setAttribute(a.name, v);
          }
        });
        svg.removeAttribute('width'); svg.removeAttribute('height');
        svg.setAttribute('class', 'pe-svg');
        svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        if (img.alt) svg.setAttribute('aria-label', img.alt);
        const node = document.importNode(svg, true);
        img.replaceWith(node);
        n++;
      } catch (e) {}
    }
    return n;
  });
  log('inlined ' + inlined + ' figures');
  const prep = await page.evaluate(({ SITE, sample }) => {
    if (sample) {
      // a short look at the design: the front matter, Part Two's opener, one chapter and the back matter
      const keep = new Set(['chapter-2']);
      document.querySelectorAll('.pe-part').forEach(p => { if (p.id !== 'part-2') p.remove(); });
      document.querySelectorAll('.pe-recto-pad').forEach(p => { if (!/^(titlep|part-2)$/.test(p.getAttribute('data-for'))) p.remove(); });
      document.querySelectorAll('article.pe-ch').forEach(a => { if (!keep.has(a.id)) a.remove(); });
      document.querySelectorAll('.pe-toc-row').forEach(r => {
        const id = (r.querySelector('a') || {}).getAttribute && r.querySelector('a').getAttribute('href').slice(1);
        if (!document.getElementById(id)) r.remove();
      });
      document.querySelectorAll('.pe-lof-list li').forEach(li => { const a = li.querySelector('a'); if (a && !document.getElementById(a.getAttribute('href').slice(1))) li.remove(); });
      document.querySelectorAll('.pe-part-list li').forEach(li => { const a = li.querySelector('a'); if (a && !document.getElementById(a.getAttribute('href').slice(1))) li.remove(); });
      const notes = document.querySelector('.pe-notes');
      if (notes) {
        let on = false;
        [...notes.children].forEach(el => {
          if (el.classList.contains('pe-notes-h')) on = /Chapter II\b/.test(el.textContent) && !/III|IV/.test(el.textContent);
          if ((el.classList.contains('pe-notes-h') || el.classList.contains('pe-refs')) && !on) el.remove();
        });
      }
      document.title = 'The Objective Ledger: a sample';
    }
    // links work from a PDF on any device
    document.querySelectorAll('a[href^="/"]').forEach(a => a.setAttribute('href', SITE + a.getAttribute('href')));
    // markers for figures and filled-in examples
    document.querySelectorAll('figure.book-fig').forEach(f => {
      const n = (f.querySelector('.book-fig-n') || {}).textContent || '';
      const m = /(\d+)/.exec(n); if (!m) return;
      const s = document.createElement('span'); s.className = 'pe-mark'; s.textContent = 'zqfigx' + m[1] + 'qz'; f.prepend(s);
    });
    document.querySelectorAll('.book-ex-wrap[data-ex-n]').forEach(x => {
      const s = document.createElement('span'); s.className = 'pe-mark'; s.textContent = 'zqexx' + x.getAttribute('data-ex-n') + 'qz'; x.prepend(s);
    });
    const qr = typeof window.peQR === 'function' ? window.peQR() : false;
    const missingQR = [...document.querySelectorAll('.pe-qr')].filter(q => !q.querySelector('svg')).length;
    const keys = [...new Set([...document.querySelectorAll('.pe-pg[data-pg]')].map(e => e.getAttribute('data-pg')))];
    const terms = [...document.querySelectorAll('.pe-ix li[data-ix]')].map(li => [li.getAttribute('data-ix'), li.getAttribute('data-ix-re'), li.hasAttribute('data-ix-cs')]);
    const pads = [...document.querySelectorAll('.pe-recto-pad[data-for]')].map(p => p.getAttribute('data-for'));
    const parts = [...document.querySelectorAll('section.pe-part[id]')].map(p => p.id);
    const chapters = [...document.querySelectorAll('article.pe-ch[id]')].map(a => a.id);
    return { qr, missingQR, keys, terms, pads, parts, chapters };
  }, { SITE, sample: !!opts.sample });
  log('prepared');
  // anything wider than the text column makes Chromium shrink every page of the book (by up to a quarter): lay
  // the book out at the column's width (132 mm) for a moment and name whatever sticks out
  const vp = page.viewportSize();
  await page.setViewportSize({ width: 499, height: 900 });
  const wide = await page.evaluate(() => {
    const W = document.documentElement.clientWidth + 1, out = [];
    for (const el of document.querySelectorAll('main *')) {
      if (el.closest('.pe-part, .pe-recto-pad, .pe-cover, .pe-backcover')) continue;
      const r = el.getBoundingClientRect();
      if (r.width && r.right > W && out.length < 8) out.push(el.tagName + '.' + el.className + ': ' + (el.textContent || '').trim().slice(0, 60));
    }
    return out;
  });
  await page.setViewportSize(vp || { width: 1280, height: 720 });
  if (wide.length) console.log('  WARNING: wider than the text column, so Chromium will print the whole book smaller:\n   ' + wide.join('\n   '));
  if (prep.missingQR) console.log('  warning: %d QR codes not drawn', prep.missingQR);
  // every picture loads before printing (lazy ones too), but a broken one never holds the book up
  await page.evaluate(async () => {
    document.querySelectorAll('img[loading="lazy"]').forEach(i => { i.loading = 'eager'; });
    const all = Promise.all([...document.images].map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; })));
    await Promise.race([all, new Promise(r => setTimeout(r, 30000))]);
  });
  log('images');

  const fill = async (map, ix) => page.evaluate(({ map, ix }) => {
    document.querySelectorAll('.pe-pg[data-pg]').forEach(e => {
      const v = map[e.getAttribute('data-pg')];
      e.textContent = v ? String(v) : '';
      // a chapter that is not in this book: point to it online instead of an empty page number
      const conn = e.closest('.pe-conn-p');
      if (conn && !v) { const a = conn.querySelector('a'); if (a) { a.textContent = 'online'; } }
      // a cross-reference whose place wasn't found: leave the reference out rather than print "page "
      const xr = e.closest('.pe-xref');
      if (xr) xr.style.display = v ? '' : 'none';
    });
    document.querySelectorAll('.pe-ix li[data-ix]').forEach(li => {
      const v = ix[li.getAttribute('data-ix')];
      li.querySelector('.pe-ixp').textContent = v || '';
      li.classList.toggle('is-empty', !v);
    });
  }, { map, ix });
  // the title page and the part openers start on a right-hand (odd) page: switch a blank page on or off
  // before each one, in page order, counting the shift the earlier ones make
  const setPads = async found => page.evaluate(({ found, pads }) => {
    let shift = 0, changed = false;
    for (const k of pads) {
      const el = document.querySelector('.pe-recto-pad[data-for="' + k + '"]');
      if (!el || !found[k]) continue;
      const at = found[k] + shift;
      if (at % 2 === 0) { const on = el.classList.toggle('is-on'); shift += on ? 1 : -1; changed = true; }
    }
    return changed;
  }, { found, pads: prep.pads });

  let buf = await render(page);
  log('first print');
  let map = {}, ix = {};
  for (let pass = 1; pass <= 7; pass++) {
    const pages = pageTexts(buf);
    const allKeys = [...new Set(prep.keys.concat(['glossary', 'notes', 'index', 'contents', 'how', 'glance', 'half', 'titlep'], prep.pads, prep.parts, prep.chapters))];
    const found = findMarks(pages, allKeys);
    const padsChanged = await setPads(found);
    // the index covers the chapters only: from the first chapter to the glossary, without the part openers
    const chapterPages = prep.chapters.map(k => found[k]).filter(Boolean);
    const from = chapterPages.length ? Math.min(...chapterPages) : 1;
    const to = (found.glossary || pages.length + 1) - 1;
    const skip = new Set(prep.parts.map(k => found[k]).filter(Boolean));
    const newIx = indexPages(pages, prep.terms, from, to, skip);
    const same = !padsChanged && JSON.stringify(found) === JSON.stringify(map) && JSON.stringify(newIx) === JSON.stringify(ix);
    map = found; ix = newIx;
    if (same) break;
    await fill(map, ix);
    buf = await render(page);
    log('pass ' + pass);
  }
  // the final copy, without the markers (they sit outside the flow, so nothing moves)
  const before = pageCount(buf);
  await page.evaluate(() => document.querySelectorAll('.pe-mark').forEach(m => m.remove()));
  buf = await render(page);
  const pages = pageCount(buf);
  if (pages !== before) console.log('  warning: page count moved from %d to %d after removing markers', before, pages);
  const blanks = await page.evaluate(() => document.querySelectorAll('.pe-recto-pad.is-on').length);
  // the covers, on their own: front, then back
  await page.evaluate(html => { const m = document.querySelector('main'); m.innerHTML = html.join('\n'); }, covers.html);
  const coverBuf = covers.html.length ? await render(page) : null;
  await page.close();
  return { buf, coverBuf, pages, blanks, meta: covers.meta, pagemap: Object.assign({}, map, ix) };
}

// pad, join the covers, add the bookmarks and the document title (tools/book/pdf_finish.py, with pypdf)
function finish(file, r, kit) {
  const interior = path.join(TMP, file + '-interior.pdf');
  const cover = path.join(TMP, file + '-cover.pdf');
  fs.writeFileSync(interior, r.buf);
  if (r.coverBuf) fs.writeFileSync(cover, r.coverBuf);
  const meta = r.meta || {};
  const outline = (meta.outline || []).map(([t, k, l]) => [t, r.pagemap[k] || 0, l]);
  const job = {
    interior, cover: r.coverBuf ? cover : null, screen: path.join(OUT, file + '.pdf'),
    title: meta.title || 'The Objective Ledger', author: meta.author || '', subject: meta.subject || '', outline,
  };
  if (kit) {
    fs.mkdirSync(PRINT_OUT, { recursive: true });
    job.print_interior = path.join(PRINT_OUT, file + '-interior.pdf');
    job.print_cover = path.join(PRINT_OUT, file + '-cover.pdf');
  }
  const jf = path.join(TMP, file + '-job.json');
  fs.writeFileSync(jf, JSON.stringify(job));
  const res = JSON.parse(execFileSync('python3', [path.join(__dirname, 'pdf_finish.py'), jf]).toString().trim().split('\n').pop());
  const size = f => { try { return fs.statSync(f).size; } catch (e) { return 0; } };
  return Object.assign(res, { bytes: size(job.screen), interior_bytes: kit ? size(job.print_interior) : 0, cover_bytes: kit ? size(job.print_cover) : 0 });
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined });
  const ctx = await browser.newContext({ ignoreHTTPSErrors: true });
  let manifest = {};
  try { manifest = JSON.parse(fs.readFileSync(path.join(OUT, 'manifest.json'), 'utf8')); } catch (e) {}
  const jobs = [];
  for (const name of NAMES) for (const deep of [false, true]) jobs.push(name + (deep ? '-in-depth' : ''));
  const want = f => !ONLY.length || ONLY.includes(f) || ONLY.includes(f.replace(/-in-depth$/, ''));
  // any other name is a page in /book/ to print as a book (for trying out a change on a copy)
  for (const extra of ONLY) if (extra !== 'sample' && !jobs.includes(extra) && !NAMES.includes(extra) && fs.existsSync(path.join(ROOT, 'book', extra + '.html'))) jobs.push(extra);
  for (const file of jobs.filter(want)) {
    const t0 = Date.now();
    const r = await makeBook(ctx, file);
    const f = finish(file, r, PRINT_KIT);
    manifest[file] = { pages: f.screen_pages, interior_pages: f.interior_pages, blank_pages: r.blanks + f.padded, bytes: f.bytes, title: (r.meta || {}).title || file, pagemap: r.pagemap };
    if (PRINT_KIT) manifest[file].print = { interior: 'print/' + file + '-interior.pdf', interior_bytes: f.interior_bytes, cover: 'print/' + file + '-cover.pdf', cover_bytes: f.cover_bytes };
    console.log(file, f.screen_pages, 'pages (interior', f.interior_pages + ')', (f.bytes / 1048576).toFixed(1) + ' MB', ((Date.now() - t0) / 1000).toFixed(0) + 's');
  }
  if (!ONLY.length || ONLY.includes('sample')) {
    const r = await makeBook(ctx, 'whole', { sample: true });
    r.meta = Object.assign({}, r.meta, { title: 'The Objective Ledger: a sample', outline: [] });
    const f = finish('sample', r, false);
    manifest.sample = { pages: f.screen_pages, bytes: f.bytes, title: 'The Objective Ledger: a sample' };
    console.log('sample', f.screen_pages, 'pages', (f.bytes / 1048576).toFixed(1) + ' MB');
  }
  fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 1) + '\n');
  await browser.close();
  fs.rmSync(TMP, { recursive: true, force: true });
})().catch(e => { console.error(e); process.exit(1); });
