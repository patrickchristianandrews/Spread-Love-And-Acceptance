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

   The print series (print12): BOOK_SERIES=1 prints the books that tools/book/build_series.py lays out in
   book/print/src/ (6 x 9 in books and an 8.5 x 11 in workbook) into book/print/, with their full-wrap covers, front-cover
   JPGs and book/print/series.json (pages, spine widths, costs). It never touches book/pdf/. Name ids to print just those.
     python3 tools/book/build_series.py
     BOOK_SERIES=1 NODE_PATH=$(npm root -g) node tools/book/build_pdfs.js 8142
     python3 tools/book/build_series.py && python3 tools/book/listing_kdp.py     (page counts onto /book/, the KDP listing)
   The book's name everywhere is series_title in tools/book/series.json.
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
// the book's one name (print12): series_title in tools/book/series.json
const SERIES_TITLE = JSON.parse(fs.readFileSync(path.join(__dirname, 'series.json'), 'utf8')).series_title;
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

// only the local site and Google Fonts load; the site's own scripts are held back (share-kit.js draws the QR codes)
async function routeSite(page) {
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
}

async function makeBook(ctx, file, opts = {}) {
  const t0 = Date.now(), log = m => { if (process.env.BOOK_VERBOSE) console.log('  %s %ds %s', file, Math.round((Date.now() - t0) / 1000), m); };
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('  page error:', e.message));
  await routeSite(page);
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
  const prep = await page.evaluate(({ SITE, SERIES_TITLE, sample }) => {
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
      document.title = SERIES_TITLE + ': a sample';
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
    const pads = [...document.querySelectorAll('.pe-recto-pad[data-for], .pe-verso-pad[data-for]')].map(p => p.getAttribute('data-for'));
    const parts = [...document.querySelectorAll('section.pe-part[id]')].map(p => p.id);
    const chapters = [...document.querySelectorAll('article.pe-ch[id]')].map(a => a.id);
    return { qr, missingQR, keys, terms, pads, parts, chapters };
  }, { SITE, SERIES_TITLE, sample: !!opts.sample });
  log('prepared');
  // anything wider than the text column makes Chromium shrink every page of the book (by up to a quarter): lay
  // the book out at the column's width (132 mm) for a moment and name whatever sticks out
  const vp = page.viewportSize();
  await page.setViewportSize({ width: opts.colPx || 499, height: 900 });
  const wide = await page.evaluate(() => {
    const hide = [...document.querySelectorAll('.pe-part, .pe-cover, .pe-backcover')];
    hide.forEach(e => { e.dataset.peDisp = e.style.display; e.style.display = 'none'; });
    const W = document.documentElement.clientWidth + 1, out = [];
    if (document.documentElement.scrollWidth > W) {
      // follow the widest branch down to the element that sticks out (its text can overflow its own box)
      let el = document.querySelector('main');
      while (el) {
        const k = [...el.children].find(c => c.scrollWidth > W || c.getBoundingClientRect().right > W);
        if (!k) break;
        el = k;
      }
      if (el) out.push(el.tagName + '.' + el.className + ': ' + (el.textContent || '').trim().slice(0, 80));
    }
    hide.forEach(e => { e.style.display = e.dataset.peDisp || ''; });
    return out;
  });
  // a filled-in example that fits on a page stays whole; only the long ones may run on to the next page
  const shortEx = await page.evaluate(() => {
    let n = 0;
    document.querySelectorAll('.book-ex-wrap').forEach(w => { if (w.getBoundingClientRect().height < 380) { w.classList.add('pe-ex-short'); n++; } });
    return n;
  });
  log('examples kept whole: ' + shortEx);
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
      const el = document.querySelector('.pe-recto-pad[data-for="' + k + '"], .pe-verso-pad[data-for="' + k + '"]');
      if (!el || !found[k]) continue;
      const at = found[k] + shift;
      // a recto pad puts what follows on a right-hand (odd) page; a verso pad (printfix13: a two-page spread) on a left-hand one
      const verso = el.classList.contains('pe-verso-pad');
      if (verso ? (at % 2 === 1) : (at % 2 === 0)) { const on = el.classList.toggle('is-on'); shift += on ? 1 : -1; changed = true; }
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
    let padsChanged = await setPads(found);
    // a filled-in example whose tab and title are stranded at the foot of a page starts on the next page
    const strand = [];
    for (const [k, pg] of Object.entries(found)) {
      const m = /^ex-(\d+)$/.exec(k);
      if (!m || !pages[pg - 1]) continue;
      const t = pages[pg - 1], i = t.search(new RegExp('FILLED-IN EXAMPLE ' + m[1] + '\\b', 'i'));
      if (i < 0) continue;
      const after = t.slice(i).split('\n').slice(1).filter(l => l.trim()).length - 2;
      if (after < 5) strand.push(m[1]);
    }
    if (strand.length) {
      const pushed = await page.evaluate(ns => ns.filter(n => { const w = document.querySelector('.book-ex-wrap[data-ex-n="' + n + '"]'); if (!w || w.classList.contains('pe-ex-push')) return false; w.classList.add('pe-ex-push'); return true; }).length, strand);
      if (pushed) { padsChanged = true; log('moved ' + pushed + ' examples to the next page'); }
    }
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
  const blanks = await page.evaluate(() => document.querySelectorAll('.pe-recto-pad.is-on, .pe-verso-pad.is-on').length);
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
    title: meta.title || SERIES_TITLE, author: meta.author || '', subject: meta.subject || '', outline,
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

// ---------- the print series (print12): BOOK_SERIES=1 ----------
// tools/book/build_series.py writes the pages in book/print/src/ and the jobs in book/print/src/series-src.json. Each
// book is printed like the packages above (page numbers, QR codes, a blank page so the first chapter starts on a
// right-hand page), padded to an even page count, then its full-wrap cover is printed with the spine width worked out
// from the final page count (KDP: page count x paper thickness), and the front cover is saved as a JPG. Writes
// book/print/<id>.pdf, cover-<id>.pdf, cover-<id>-front.jpg (1600 px wide), cover-<id>-front-small.jpg (480 px wide)
// and book/print/series.json. Nothing in book/pdf/ is touched.
const SERIES_OUT = path.join(ROOT, 'book', 'print');
const r2 = x => Math.round(x * 100) / 100;

function seriesCosts(job, pages, C) {
  const large = job.kind === 'workbook';
  const kdp = large ? C.kdp_large : C.kdp, ing = large ? C.ingram_large : C.ingram, d = C.direct;
  const P = job.price;
  const kdpPrint = kdp.fixed + kdp.per_page * pages;
  const ingPrint = ing.fixed + ing.per_page * pages;
  const card = d.card_pct * P + d.card_fixed;
  const row = net => ({ net: r2(net), pct: Math.round(net / P * 1000) / 10 });
  return {
    list_price: P,
    kdp_amazon: Object.assign({ print: r2(kdpPrint) }, row(kdp.royalty * P - kdpPrint)),
    kdp_expanded: Object.assign({ print: r2(kdpPrint) }, row(kdp.expanded * P - kdpPrint)),
    ingram_bookshops: Object.assign({ print: r2(ingPrint), discount: ing.discount }, row(P * (1 - ing.discount) - ing.market_fee * P - ingPrint)),
    direct_estimate: Object.assign({ print: r2(ingPrint), card_fee: r2(card) }, row(P - ingPrint - card)),
    direct_with_fulfil_fee: Object.assign({ print: r2(ingPrint), card_fee: r2(card), fulfil_fee: d.fulfil_fee }, row(P - ingPrint - card - d.fulfil_fee)),
  };
}

async function makeCover(browser, job, pages) {
  const spine = pages * job.paper_in;
  const W = 2 * 0.125 + 2 * job.trim[0] + spine, H = job.trim[1] + 0.25;
  const shoot = async (dsf, file) => {
    const c = await browser.newContext({ deviceScaleFactor: dsf, viewport: { width: Math.ceil(W * 96) + 2, height: Math.ceil(H * 96) + 2 } });
    const page = await c.newPage();
    page.on('pageerror', e => console.log('  page error:', e.message));
    await routeSite(page);
    await page.goto(`http://127.0.0.1:${PORT}/book/print/src/${job.cover}.html`, { waitUntil: 'load', timeout: 120000 });
    await page.addScriptTag({ url: '/assets/js/share-kit.js' }).catch(() => page.addScriptTag({ path: path.join(ROOT, 'assets/js/share-kit.js') }));
    const info = await page.evaluate(async ({ spine, W, H, text }) => {
      document.documentElement.style.setProperty('--spine', spine + 'in');
      document.documentElement.classList.toggle('has-spine-text', text);
      const st = document.createElement('style');
      st.textContent = '@page { size: ' + W + 'in ' + H + 'in; margin: 0; }';
      document.head.appendChild(st);
      if (typeof peQR === 'function') peQR();
      await Promise.all([...document.fonts].map(f => f.load().catch(() => null)));
      await document.fonts.ready;
      const t = document.querySelector('.cv-spine-t'), sp = document.querySelector('.cv-spine');
      // the spine words must fit the spine with KDP's 0.0625 in on each side
      const fits = !text || (t.getBoundingClientRect().width <= sp.getBoundingClientRect().width - 12 && t.getBoundingClientRect().height <= sp.getBoundingClientRect().height - 48);
      const qrs = document.querySelectorAll('.pe-qr svg').length;
      return { fits, qrs };
    }, { spine, W, H, text: pages > 79 });
    if (!info.fits) console.log('  warning: the spine text does not fit the spine of', job.id);
    let out = null;
    if (file === 'pdf') out = await page.pdf({ width: W + 'in', height: H + 'in', printBackground: true, preferCSSPageSize: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
    else out = await page.locator('#front').screenshot({ type: 'jpeg', quality: 90 });
    await c.close();
    return out;
  };
  const pdf = await shoot(1, 'pdf');
  fs.writeFileSync(path.join(SERIES_OUT, job.cover + '.pdf'), pdf);
  const big = path.join(SERIES_OUT, job.cover + '-front.jpg');
  fs.writeFileSync(big, await shoot(1600 / (job.trim[0] * 96), 'jpg'));
  execFileSync('python3', ['-c', 'import sys\nfrom PIL import Image\nim = Image.open(sys.argv[1]); w = 480; h = round(im.height * w / im.width)\nim.convert("RGB").resize((w, h), Image.LANCZOS).save(sys.argv[2], quality=84, optimize=True, progressive=True)', big, path.join(SERIES_OUT, job.cover + '-front-small.jpg')]);
  return { spine_in: Math.round(spine * 10000) / 10000, spine_mm: Math.round(spine * 25.4 * 100) / 100, cover_in: [Math.round(W * 10000) / 10000, H], spine_text: pages > 79 };
}

async function runSeries(browser, ctx) {
  const src = JSON.parse(fs.readFileSync(path.join(SERIES_OUT, 'src', 'series-src.json'), 'utf8'));
  let made = {};
  try { made = JSON.parse(fs.readFileSync(path.join(SERIES_OUT, 'series.json'), 'utf8')); } catch (e) {}
  // a full run starts the list afresh (books renamed or dropped don't linger); a named run updates just those
  made.books = ONLY.length ? (made.books || {}) : {};
  const jobs = src.jobs.filter(j => ONLY.length ? ONLY.includes(j.id) : !j.only_when_named);
  for (const job of jobs) {
    const t0 = Date.now();
    const r = await makeBook(ctx, 'print/src/' + job.id, { colPx: job.colPx });
    if (job.kind === 'measure') {
      fs.writeFileSync(path.join(SERIES_OUT, 'src', 'measure.json'), JSON.stringify({ pages: r.pages, pagemap: r.pagemap }, null, 1) + '\n');
      console.log('measure', r.pages, 'pages');
      continue;
    }
    const interior = path.join(TMP, job.id + '-interior.pdf');
    fs.writeFileSync(interior, r.buf);
    const meta = r.meta || {};
    const outline = (meta.outline || []).map(([t, k, l]) => [t, r.pagemap[k] || 0, l]);
    const jf = path.join(TMP, job.id + '-job.json');
    const out = path.join(SERIES_OUT, job.id + '.pdf');
    fs.writeFileSync(jf, JSON.stringify({ interior, cover: null, screen: out, title: meta.title || job.title, author: meta.author || '', subject: meta.subject || '', outline }));
    const f = JSON.parse(execFileSync('python3', [path.join(__dirname, 'pdf_finish.py'), jf]).toString().trim().split('\n').pop());
    const pages = f.interior_pages;
    const cov = job.cover ? await makeCover(browser, job, pages) : {};
    made.books[job.id] = Object.assign({ n: job.n, title: job.title, kind: job.kind, trim_in: job.trim, pages, blank_pages: r.blanks + f.padded,
      bytes: fs.statSync(out).size, pdf: job.id + '.pdf', cover_pdf: job.cover + '.pdf', front_jpg: job.cover + '-front.jpg' }, cov,
      { costs: seriesCosts(job, pages, src.costs), pagemap: r.pagemap });
    console.log(job.id, pages, 'pages,', 'spine', cov.spine_in, 'in,', (made.books[job.id].bytes / 1048576).toFixed(1) + ' MB', ((Date.now() - t0) / 1000).toFixed(0) + 's');
  }
  made.generated = new Date().toISOString().slice(0, 10);
  made.paper_in = src.paper_in;
  made.paper_note = src.paper_note;
  made.cost_notes = Object.fromEntries(Object.entries(src.costs).map(([k, v]) => [k, v.note]));
  fs.writeFileSync(path.join(SERIES_OUT, 'series.json'), JSON.stringify(made, null, 1) + '\n');
}

(async () => {
  if (process.env.BOOK_SERIES === '1') {
    const browser = await chromium.launch({ executablePath: fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined });
    const ctx = await browser.newContext({ ignoreHTTPSErrors: true });
    await runSeries(browser, ctx);
    await browser.close();
    fs.rmSync(TMP, { recursive: true, force: true });
    return;
  }
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
    r.meta = Object.assign({}, r.meta, { title: SERIES_TITLE + ': a sample', outline: [] });
    const f = finish('sample', r, false);
    manifest.sample = { pages: f.screen_pages, bytes: f.bytes, title: SERIES_TITLE + ': a sample' };
    console.log('sample', f.screen_pages, 'pages', (f.bytes / 1048576).toFixed(1) + ' MB');
  }
  fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 1) + '\n');
  await browser.close();
  fs.rmSync(TMP, { recursive: true, force: true });
})().catch(e => { console.error(e); process.exit(1); });
