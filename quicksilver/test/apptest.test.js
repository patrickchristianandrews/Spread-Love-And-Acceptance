// The built-in App tester, in the real app: a small site with a JavaScript error, a missing image,
// a request that fails, a page that spills off a phone screen and an image without alt text. It
// follows the site's links and reports each, and leaves nothing open behind it. Also the Liquid
// Edition card lists the plug-ins it comes with.
'use strict';
const { _electron: electron } = require('playwright');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const http = require('node:http');
const assert = require('node:assert/strict');
const ROOT = path.join(__dirname, '..');

(async () => {
  const pages = {
    '/': '<html><head><title>Home</title><meta name="viewport" content="width=device-width"></head><body><h1>Shop</h1><a href="/about">About</a> <a href="/broken">Broken</a> <a href="/logout">Log out</a> <a href="https://elsewhere.invalid/">Away</a><img src="/missing.png" alt="x"><div style="width:900px">wide</div><script>fetch("/api/fails"); undefinedFunction();</script></body></html>',
    '/about': '<html><head><title>About</title></head><body><h1>About</h1><img src="/ok.svg"><input name="q"></body></html>',
    '/ok.svg': '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"></svg>',
  };
  const visited = [];
  const site = http.createServer((req, res) => {
    visited.push(req.url);
    const body = pages[req.url];
    if (!body) { res.writeHead(req.url === '/api/fails' ? 500 : 404); return res.end('no'); }
    res.writeHead(200, { 'Content-Type': req.url.endsWith('.svg') ? 'image/svg+xml' : 'text/html' });
    res.end(body);
  });
  await new Promise((r) => site.listen(0, '127.0.0.1', r));
  const url = `http://127.0.0.1:${site.address().port}/`;
  const HOME = fs.mkdtempSync(path.join(os.tmpdir(), 'qs-apptest-'));
  const app = await electron.launch({ executablePath: require('electron'), args: ['--no-sandbox', ROOT],
    env: { ...process.env, QUICKSILVER_HOME: HOME, QS_LLAMA_SERVER: path.join(__dirname, 'fakes', 'llama-server'), QS_SD_BIN: path.join(__dirname, 'fakes', 'sd'), QS_SCAN_DIRS: path.join(HOME, 'nothing-here') } });
  try {
    const win = await app.firstWindow();
    await win.waitForSelector('#nav', { timeout: 60000 }).catch(() => {});
    const before = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length);
    const report = await app.evaluate(async (_e, [u, mod]) => process.mainModule.require(mod).testApp(u, 6), [url, path.join(ROOT, 'src', 'main', 'integrations-dev.js')]);
    const after = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length);
    const has = (re, what) => assert.match(report, re, `${what}\n${report}`);
    has(/# App test: http:\/\/127\.0\.0\.1/, 'the site');
    has(/JavaScript error · \/: [^\n]*undefinedFunction/, 'the JavaScript error, with its page');
    has(/Failed request · 500 GET [^\n]*\/api\/fails/, 'the failing API call');
    has(/Failed request · 404 GET [^\n]*\/missing\.png/, 'the missing image');
    has(/\/broken did not load|Failed request · 404 GET [^\n]*\/broken/, 'the broken link');
    has(/scrolls sideways/, 'the page wider than a phone');
    has(/1 image without alt text/, 'alt text');
    has(/1 form field without a label/, 'labels');
    has(/- \/about · "About"/, 'the linked page was visited');
    assert.ok(!visited.includes('/logout'), 'a log-out link is never followed');
    assert.ok(!/elsewhere\.invalid/.test(report), 'other sites are not visited');
    assert.equal(after, before, 'the hidden window is closed afterwards');
    console.log('✓ App tester: JavaScript errors, failed requests, missing images, broken links, phone overflow, alt text and labels, same site only, nothing left open');
    // Pictures from the web show in the chat (served from this PC as qsmedia://w/…), under the answer.
    const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
    const wdir = path.join(HOME, 'tmp', 'web-images'); fs.mkdirSync(wdir, { recursive: true });
    fs.writeFileSync(path.join(wdir, 'abcdef0123456789abcd.png'), PNG);
    const shown = await win.evaluate(async () => {
      const alt = { text: 'Here you go.', toolCalls: [{ name: 'image_search', source: 'Pictures from the web', status: 'done', result: `Showing 1\n[[web-images:${JSON.stringify([{ title: 'A fox', src: 'qsmedia://w/abcdef0123456789abcd.png', page: 'https://example.org/fox', source: 'flickr', license: 'BY 2.0' }])}]]` }] };
      const box = document.createElement('div'); box.innerHTML = webImagesHTML(alt, { id: 'm1' }); document.body.appendChild(box);
      const img = box.querySelector('.web-img img');
      await new Promise((r) => { if (img.complete) r(); else { img.onload = r; img.onerror = r; } });
      const res = { n: box.querySelectorAll('.web-img').length, w: img.naturalWidth, text: box.innerText, describe: Boolean(box.querySelector('[data-webimg-describe]')) };
      box.remove(); return res;
    });
    assert.deepEqual([shown.n, shown.w, shown.describe], [1, 1, true], `the picture shows: ${JSON.stringify(shown)}`);
    assert.match(shown.text, /flickr · BY 2\.0[\s\S]*1 pictures from the web · safe search on/);
    console.log('✓ pictures from the web show under the answer, from this PC, with source, license and Describe these');
    // Your Crew → Downloads: the torrent page, and the torrent engine starts inside the app.
    await win.evaluate(() => { document.querySelector('#wc-close')?.click(); go({ view: 'assistants' }); });
    await win.click('[data-crew-tab="downloads"]');
    await win.waitForSelector('#t-add');
    assert.match(await win.locator('#main').innerText(), /Save to:[\s\S]*Search free collections/);
    assert.equal(await win.evaluate(() => document.querySelector('.nav-item[data-nav="assistants"]')?.classList.contains('active')), true, 'Your Crew stays highlighted');
    const started = await app.evaluate(async (_e, mod) => { try { await process.mainModule.require(mod).engine(); return 'ok'; } catch (err) { return String(err.message); } }, path.join(ROOT, 'src', 'main', 'torrents.js'));
    assert.equal(started, 'ok', `the torrent engine starts inside the app: ${started}`);
    console.log('✓ Your Crew → Downloads: the torrent page, with the engine running inside the app');
    // Safe search: the Settings switch, kept across a reload, sent with every web search the app
    // makes (the chat's search and a search again), straight into the request that leaves the app.
    await app.evaluate(() => {
      global.__sent = [];
      const real = global.fetch;
      global.fetch = async (url, o = {}) => {
        const u = String(url);
        if (/duckduckgo|mojeek|wikipedia\.org\/w\/api/.test(u)) { global.__sent.push(`${u} ${o.body || ''}`); return new Response(/wikipedia/.test(u) ? '{"query":{"search":[]}}' : '<a class="result__a" href="https://example.org/a">A</a>', { status: 200, headers: { 'content-type': 'text/html' } }); }
        return real(url, o);
      };
    });
    // Keep opening the Web search settings until the switch shows (app start-up can re-render home
    // over it), and capture its checked state the instant it appears so a later re-render can't
    // detach it mid-check. Returns true/false (the switch's state) or null if it never showed.
    const openSwitch = async () => {
      await win.waitForFunction(() => { const el = document.querySelector('#w-safe'); if (el) { window.__wsafe = el.checked; return true; } if (typeof go === 'function' && typeof S !== 'undefined' && S.data) { setTab = 'web'; go({ view: 'settings' }); } return false; }, { timeout: 20000 }).catch(() => {});
      return win.evaluate(() => (typeof window.__wsafe === 'boolean' ? window.__wsafe : null));
    };
    // Flip the switch in the same tick it's found, so a re-render can't detach it between find and click.
    const clickSwitch = () => win.waitForFunction(() => { const el = document.querySelector('#w-safe'); if (el) { el.click(); return true; } if (typeof go === 'function' && typeof S !== 'undefined' && S.data) { setTab = 'web'; go({ view: 'settings' }); } return false; }, { timeout: 20000 });
    await win.evaluate(() => localStorage.removeItem('safesearch.v1')); // (a fresh start: nothing saved yet)
    assert.equal(await openSwitch(), true, 'on by default');
    await clickSwitch();
    assert.equal(await win.evaluate(() => localStorage.getItem('safesearch.v1')), 'off');
    await win.reload();
    await win.waitForFunction(() => typeof safeSearchValue === 'function' && typeof S !== 'undefined' && S.data);
    assert.equal(await win.evaluate(() => safeSearchValue()), 'off', 'still off after a reload');
    assert.equal(await openSwitch(), false, 'and the switch shows it');
    const sentOff = await win.evaluate(async () => { await webSearch('breast augmentation'); await webSearch('breast augmentation'); return true; }).then(() => app.evaluate(() => global.__sent.splice(0)));
    assert.ok(sentOff.filter((l) => /duckduckgo/.test(l)).length === 2 && sentOff.filter((l) => /duckduckgo/.test(l)).every((l) => /kp=-2/.test(l)), `off (and on the search again): ${sentOff}`);
    assert.ok(sentOff.some((l) => /mojeek\.com\/search\?q=breast%20augmentation&safe=0/.test(l)));
    await clickSwitch();
    await win.evaluate(() => webSearch('breast augmentation'));
    const sentOn = await app.evaluate(() => global.__sent.splice(0));
    assert.ok(sentOn.some((l) => /duckduckgo.*kp=1\b/.test(l)) && sentOn.some((l) => /safe=1\b/.test(l)), `on flips it: ${sentOn}`);
    console.log(`✓ safe search in the app: on by default, kept across a reload, sent with every search (search again too), flipped by the switch\n    sent: ${sentOff.find((l) => /duckduckgo/.test(l))}`);
    // The plug-ins on the Liquid Edition card.
    await win.evaluate(() => { document.querySelector('#wc-close')?.click(); go({ view: 'stacks' }); });
    await win.waitForSelector('#liquid-plugins:has-text("App tester"):has-text("Security audit"):has-text("Design extractor")', { timeout: 30000 });
    console.log('✓ The Liquid Edition card lists its built-in plug-ins');
  } finally { await app.close().catch(() => {}); site.close(); }
  process.exit(0);
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
