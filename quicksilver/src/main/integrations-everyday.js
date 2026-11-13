// Everyday & research plug-ins built into Quicksilver (and so into every Liquid Edition): free
// services that need no account and no key, and tools that run on this PC. On by default; each is
// offered to the model only when a message needs it (see `when`), so small models aren't handed a
// long list of tools they don't need. Switch any of them off under Connectors.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const UA = 'Quicksilver/2.20 (desktop AI app; https://github.com/patrickchristianandrews/Spread-Love-And-Acceptance)';
const isOffline = () => { try { return require('./offline').isOffline(); } catch { return false; } };
async function getJSON(url, { headers = {}, ms = 15000 } = {}) {
  if (isOffline()) throw new Error('Quicksilver is offline. Go online to use this.');
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json', ...headers }, signal: AbortSignal.timeout(ms) });
  if (!res.ok) throw new Error(`${new URL(url).hostname} returned HTTP ${res.status}.`);
  return res.json();
}
async function getText(url, { ms = 15000 } = {}) {
  if (isOffline()) throw new Error('Quicksilver is offline. Go online to use this.');
  const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(ms), redirect: 'follow' });
  if (!res.ok) throw new Error(`${new URL(url).hostname} returned HTTP ${res.status}.`);
  return res.text();
}
const decode = (s) => String(s || '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
const pageText = (html) => decode(String(html || '').replace(/<(script|style|noscript|svg|nav|footer|header|form)[\s\S]*?<\/\1>/gi, ' ').replace(/<br\s*\/?>|<\/(p|div|li|h\d|tr|section|article)>/gi, '\n').replace(/<[^>]+>/g, ' ')).replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n\n').trim();

// ---------- calculator (no eval: a small parser) ----------
const FUNCS = { sqrt: Math.sqrt, cbrt: Math.cbrt, abs: Math.abs, round: Math.round, floor: Math.floor, ceil: Math.ceil, ln: Math.log, log: Math.log10, log2: Math.log2, exp: Math.exp,
  sin: (x) => Math.sin(x), cos: (x) => Math.cos(x), tan: (x) => Math.tan(x), asin: Math.asin, acos: Math.acos, atan: Math.atan, min: Math.min, max: Math.max, pow: Math.pow };
function calculate(expr) {
  const src = String(expr || '').replace(/×/g, '*').replace(/÷/g, '/').replace(/,(?=\d{3}\b)/g, '').replace(/\*\*/g, '^').trim();
  if (!src || src.length > 400) throw new Error('Give a sum to work out, e.g. (12.5 * 4) / 3 or sqrt(2) ^ 3.');
  const toks = src.match(/\d+\.?\d*(e[+-]?\d+)?%?|\.\d+|[a-z_]+|[-+*/^(),!]/gi) || [];
  if (toks.join('') !== src.replace(/\s+/g, '')) throw new Error(`I can only work out numbers, + - * / ^ %, brackets and functions like sqrt, sin, log. Couldn't read: ${src}`);
  let i = 0;
  const peek = () => toks[i]; const next = () => toks[i++];
  const expect = (t) => { if (next() !== t) throw new Error(`Expected "${t}" in ${src}`); };
  const primary = () => {
    const t = next();
    if (t === undefined) throw new Error(`The sum ends too early: ${src}`);
    if (t === '(') { const v = sum(); expect(')'); return v; }
    if (t === '-') return -factor();
    if (t === '+') return factor();
    if (/^[\d.]/.test(t)) return t.endsWith('%') ? parseFloat(t) / 100 : parseFloat(t);
    const name = t.toLowerCase();
    if (name === 'pi') return Math.PI;
    if (name === 'e') return Math.E;
    if (FUNCS[name]) { expect('('); const args = [sum()]; while (peek() === ',') { next(); args.push(sum()); } expect(')'); return FUNCS[name](...args); }
    throw new Error(`Unknown word "${t}" in ${src}`);
  };
  const postfix = () => { let v = primary(); while (peek() === '!') { next(); if (v < 0 || v > 170 || v % 1) throw new Error('Factorial needs a whole number from 0 to 170.'); let f = 1; for (let k = 2; k <= v; k++) f *= k; v = f; } return v; };
  const factor = () => { const b = postfix(); if (peek() === '^') { next(); return b ** factor(); } return b; };
  const term = () => { let v = factor(); while (['*', '/'].includes(peek()) || (peek() && /^[(a-z\d]/i.test(peek()))) { const op = ['*', '/'].includes(peek()) ? next() : '*'; const r = factor(); v = op === '*' ? v * r : v / r; } return v; };
  const sum = () => { let v = term(); while (['+', '-'].includes(peek())) { const op = next(); const r = term(); v = op === '+' ? v + r : v - r; } return v; };
  const v = sum();
  if (i < toks.length) throw new Error(`Couldn't read the end of: ${src}`);
  if (!Number.isFinite(v)) throw new Error('The answer is not a finite number (dividing by zero?).');
  const shown = Math.abs(v) >= 1e15 || (Math.abs(v) < 1e-6 && v !== 0) ? v.toExponential(10) : String(Number(v.toPrecision(15)));
  return `${src} = ${shown}`;
}

// ---------- units ----------
const UNITS = {
  length: { m: 1, km: 1000, cm: 0.01, mm: 0.001, um: 1e-6, nm: 1e-9, mi: 1609.344, mile: 1609.344, miles: 1609.344, yd: 0.9144, yard: 0.9144, ft: 0.3048, foot: 0.3048, feet: 0.3048, in: 0.0254, inch: 0.0254, inches: 0.0254, nmi: 1852, ly: 9.4607e15 },
  mass: { kg: 1, g: 0.001, mg: 1e-6, t: 1000, tonne: 1000, lb: 0.45359237, lbs: 0.45359237, pound: 0.45359237, pounds: 0.45359237, oz: 0.028349523125, ounce: 0.028349523125, st: 6.35029318, stone: 6.35029318 },
  volume: { l: 1, liter: 1, litre: 1, ml: 0.001, cl: 0.01, m3: 1000, gal: 3.785411784, gallon: 3.785411784, qt: 0.946352946, pt: 0.473176473, cup: 0.2365882365, floz: 0.0295735295625, tbsp: 0.01478676478125, tsp: 0.00492892159375, 'uk gal': 4.54609, 'uk pint': 0.56826125 },
  speed: { 'm/s': 1, 'km/h': 1 / 3.6, kph: 1 / 3.6, mph: 0.44704, knot: 0.514444, knots: 0.514444, 'ft/s': 0.3048 },
  area: { m2: 1, km2: 1e6, cm2: 1e-4, ha: 1e4, hectare: 1e4, acre: 4046.8564224, acres: 4046.8564224, ft2: 0.09290304, sqft: 0.09290304, mi2: 2589988.110336, in2: 0.00064516 },
  data: { b: 1, byte: 1, bytes: 1, kb: 1e3, mb: 1e6, gb: 1e9, tb: 1e12, kib: 1024, mib: 1024 ** 2, gib: 1024 ** 3, tib: 1024 ** 4, bit: 0.125, bits: 0.125, mbit: 125000, gbit: 1.25e8 },
  time: { s: 1, sec: 1, second: 1, seconds: 1, min: 60, minute: 60, minutes: 60, h: 3600, hr: 3600, hour: 3600, hours: 3600, day: 86400, days: 86400, week: 604800, weeks: 604800, year: 31557600, years: 31557600 },
  energy: { j: 1, kj: 1000, cal: 4.184, kcal: 4184, wh: 3600, kwh: 3.6e6, btu: 1055.05585 },
  pressure: { pa: 1, kpa: 1000, bar: 1e5, psi: 6894.757, atm: 101325, mmhg: 133.322 },
};
const TEMP = { c: 'c', celsius: 'c', '°c': 'c', f: 'f', fahrenheit: 'f', '°f': 'f', k: 'k', kelvin: 'k' };
function convertUnits(value, from, to) {
  const v = Number(value); const a = String(from || '').toLowerCase().trim(); const b = String(to || '').toLowerCase().trim();
  if (!Number.isFinite(v)) throw new Error('Give a number to convert.');
  if (TEMP[a] && TEMP[b]) {
    const c = TEMP[a] === 'c' ? v : TEMP[a] === 'f' ? (v - 32) * 5 / 9 : v - 273.15;
    const out = TEMP[b] === 'c' ? c : TEMP[b] === 'f' ? c * 9 / 5 + 32 : c + 273.15;
    return `${v} ${from} = ${Number(out.toFixed(4))} ${to}`;
  }
  for (const [kind, t] of Object.entries(UNITS)) {
    if (t[a] !== undefined && t[b] !== undefined) return `${v} ${from} = ${Number((v * t[a] / t[b]).toPrecision(8))} ${to} (${kind})`;
  }
  throw new Error(`Can't convert ${from} to ${to}. Known units: ${Object.entries(UNITS).map(([k, t]) => `${k} (${Object.keys(t).slice(0, 6).join(', ')}…)`).join('; ')}; temperature (C, F, K).`);
}

// ---------- files on this PC ----------
const homeDirs = () => ['Documents', 'Desktop', 'Downloads'].map((d) => path.join(os.homedir(), d)).filter((d) => { try { return fs.statSync(d).isDirectory(); } catch { return false; } });
function inside(p, roots) { const r = path.resolve(p); return roots.some((root) => r === path.resolve(root) || r.startsWith(path.resolve(root) + path.sep)); }

module.exports = ({ cfg }) => {
  const C = (id) => cfg()[id] || {};
  const roots = () => { const extra = String(C('pcfiles').folders || '').split(/[;\n]/).map((s) => s.trim()).filter(Boolean); return [...homeDirs(), ...extra]; };
  const allowed = (p) => { if (!p) throw new Error('Give a file or folder path.'); const full = path.resolve(p.replace(/^~(?=$|[\\/])/, os.homedir())); if (!inside(full, roots())) throw new Error(`Only files in ${roots().join(', ')} can be used (add more folders under Connectors → Files on this PC).`); return full; };

  const CONNECTORS = {
    webtools: { name: 'Web search & page reader', icon: '🔎', group: 'Everyday', defaultOn: true, noToken: true, builtIn: true,
      // (Questions about current things already get a web search of their own in chat; this is for
      // reading a page you give and for searching as one step of a bigger job.)
      when: /https?:\/\/\S+|\bwww\.\S+\.\w+|\b(read|open|summari[sz]e|look at|check) (this|the|that) (page|article|link|url|site|post)\b|\bsearch (the web|online|the internet) (for|and)\b|\bresearch (and|then) (write|compare|summari[sz]e)\b/i,
      blurb: 'Search the web and read any page as clean text, so answers can use what is online now. Free, no account (DuckDuckGo with backups; your own search key if you set one in Settings).', fields: [] },
    calc: { name: 'Calculator & units', icon: '🧮', group: 'Everyday', defaultOn: true, noToken: true, builtIn: true,
      when: /\d+(\.\d+)?\s*%\s*of\b|\d\s*[-+*/^×÷%]\s*\d|\b(calculate|compute|how much is|what is \d|convert|in (km|miles?|kg|lbs?|pounds|celsius|fahrenheit|liters?|gallons?|feet|meters?|inches|cm|mph|km\/h)|sqrt|square root|percent|factorial)\b/i,
      blurb: 'Exact sums (brackets, powers, percentages, sqrt, log, sin…) and unit conversions (length, weight, volume, speed, area, data, energy, temperature), worked out on this PC.', fields: [] },
    worldtime: { name: 'World time', icon: '🕒', group: 'Everyday', defaultOn: true, noToken: true, builtIn: true,
      when: /\b(what time|time (is it )?in|time zones?|timezone|local time|days? (until|between|since)|what day)\b/i,
      blurb: 'The time anywhere in the world, time-zone differences and days between dates.', fields: [] },
    money: { name: 'Currency, stocks & crypto', icon: '💱', group: 'Money', defaultOn: true, noToken: true, builtIn: true,
      when: /\b(exchange rate|convert \d[\d.,]*\s*[a-z]{3}\b|[a-z]{3} to [a-z]{3}|usd|eur|gbp|jpy|dollars? (to|in)|euros?|pounds? sterling|stock|share price|ticker|nasdaq|s&p|bitcoin|btc|ethereum|eth|crypto|coin price|dogecoin|solana)\b/i,
      blurb: 'Exchange rates (European Central Bank, via Frankfurter), crypto prices (CoinGecko) and daily stock prices (Stooq). Free, no account.', fields: [] },
    research: { name: 'Research papers & tech news', icon: '🔬', group: 'Research & learning', defaultOn: true, noToken: true, builtIn: true,
      when: /\b(papers?|research|studies|study on|arxiv|pubmed|medical literature|clinical trials?|preprints?|hacker news|citations?|literature review)\b/i,
      blurb: 'Search research papers on arXiv and medical studies on PubMed, and what developers are discussing on Hacker News. Free, no account.', fields: [] },
    maps: { name: 'Maps & directions', icon: '🗺️', group: 'Everyday', defaultOn: true, noToken: true, builtIn: true,
      when: /\b(where is|address of|directions?|how far|distance (from|between)|drive (from|to)|route (from|to)|near(by| me)?|coordinates|latitude|longitude|map of)\b/i,
      blurb: 'Find places and addresses (OpenStreetMap) and driving distance and time between them (OSRM). Free, no account.', fields: [] },
    words: { name: 'Dictionary & books', icon: '📚', group: 'Research & learning', defaultOn: true, noToken: true, builtIn: true,
      when: /\b(define|definition|meaning of|what does .{1,30} mean|synonyms?|pronounc\w*|etymology|books? (by|about|on)|author of|isbn|novels? by)\b/i,
      blurb: 'Word definitions, pronunciation and synonyms (Free Dictionary API), and books by title, author or subject (Open Library). Free, no account.', fields: [] },
    holidays: { name: 'Public holidays', icon: '🎉', group: 'Everyday', defaultOn: true, noToken: true, builtIn: true,
      when: /\b(public holidays?|bank holidays?|national holidays?|day off|is .{1,20} a holiday|long weekend)\b/i,
      blurb: 'Public holidays for 100+ countries, any year (Nager.Date). Free, no account.', fields: [] },
    pcfiles: { name: 'Files on this PC', icon: '🗂️', group: 'Files & storage', defaultOn: true, noToken: true, builtIn: true,
      when: /\b(my (files?|documents?|downloads|desktop|folders?|pdfs?|spreadsheets?|notes)|in (my )?(documents|downloads|desktop)|find (the|a|my) file|on my (pc|computer)|(open|read|list) (the )?(file|folder))\b|[a-z]:\\|~\//i,
      blurb: 'Find, list and read files in your Documents, Desktop and Downloads (and any folders you add); saving a file always asks you first. Nothing leaves this PC.',
      fields: [{ key: 'folders', label: 'More folders (optional)', placeholder: 'D:\\Projects; E:\\Photos', help: 'Separate with ; — Documents, Desktop and Downloads are always included.' }] },
    webshot: { name: 'Website screenshots', icon: '📸', group: 'Build & ship', defaultOn: true, noToken: true, builtIn: true,
      when: /\b(screenshot|screen shot|capture|what does .{1,40} look like|show me (the )?(site|page|website))\b/i,
      blurb: 'Takes a picture of any web page (or an app on this PC), on a computer or phone-sized screen, and saves it.', fields: [] },
  };

  const TOOLS = {
    webtools: [
      { name: 'web_search', description: 'Search the web. Returns titles, links and the matching passages of the top pages.', parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] },
        run: async ({ query }) => { if (isOffline()) throw new Error('Quicksilver is offline.'); const r = await require('./websearch').search(String(query || ''), { pages: 3 }); return r.map((x, i) => `[${i + 1}] ${x.title}\n${x.url}\n${(x.text || x.snippet || '').slice(0, 1200)}`).join('\n\n') || 'No results.'; } },
      { name: 'read_page', description: 'Read a web page as clean text (articles, docs, product pages).', parameters: { type: 'object', properties: { url: { type: 'string' }, focus: { type: 'string', description: 'Optional: what to look for on the page' } }, required: ['url'] },
        run: async ({ url, focus }) => { const u = /^https?:\/\//.test(url) ? url : `https://${url}`; const text = pageText(await getText(u)); return focus ? require('./websearch').bestPassages(text, String(focus), 6000) : text.slice(0, 12000); } },
    ],
    calc: [
      { name: 'calculate', description: 'Work out a sum exactly: + - * / ^ %, brackets, sqrt, cbrt, log (base 10), ln, sin/cos/tan (radians), round, min, max, factorial (!), pi, e.', parameters: { type: 'object', properties: { expression: { type: 'string' } }, required: ['expression'] },
        run: async ({ expression }) => calculate(expression) },
      { name: 'convert_units', description: 'Convert between units: length, weight, volume, speed, area, data, time, energy, pressure and temperature (C, F, K).', parameters: { type: 'object', properties: { value: { type: 'number' }, from: { type: 'string' }, to: { type: 'string' } }, required: ['value', 'from', 'to'] },
        run: async ({ value, from, to }) => convertUnits(value, from, to) },
    ],
    worldtime: [
      { name: 'world_time', description: 'The current local time and time zone of a city or place (or an IANA zone like Asia/Tokyo).', parameters: { type: 'object', properties: { place: { type: 'string' } }, required: ['place'] },
        run: async ({ place }) => {
          let zone = String(place || '').trim(); let name = zone;
          if (!/^[A-Za-z_]+\/[A-Za-z_]+/.test(zone)) {
            const g = await getJSON(`https://geocoding-api.open-meteo.com/v1/search?count=1&name=${encodeURIComponent(zone)}`);
            const r = g.results?.[0]; if (!r) throw new Error(`Couldn't find ${place}.`);
            zone = r.timezone; name = [r.name, r.admin1, r.country].filter(Boolean).join(', ');
          }
          const now = new Date();
          const fmt = new Intl.DateTimeFormat('en-US', { timeZone: zone, weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'longOffset' }).format(now);
          return `${name} (${zone}): ${fmt}`;
        } },
      { name: 'days_between', description: 'Days (and weeks) between two dates, or from today until a date. Dates as YYYY-MM-DD.', parameters: { type: 'object', properties: { from: { type: 'string', description: 'YYYY-MM-DD, or empty for today' }, to: { type: 'string' } }, required: ['to'] },
        run: async ({ from, to }) => {
          const d = (s) => { const t = s ? new Date(`${s}T00:00:00Z`) : new Date(new Date().toISOString().slice(0, 10)); if (Number.isNaN(t.getTime())) throw new Error(`Not a date: ${s}`); return t; };
          const a = d(from); const b = d(to); const n = Math.round((b - a) / 86400000);
          return `${a.toISOString().slice(0, 10)} → ${b.toISOString().slice(0, 10)}: ${n} day${Math.abs(n) === 1 ? '' : 's'} (${(n / 7).toFixed(1)} weeks)`;
        } },
    ],
    money: [
      { name: 'currency_convert', description: 'Convert money between currencies at today\'s European Central Bank rate (or a past date).', parameters: { type: 'object', properties: { amount: { type: 'number' }, from: { type: 'string', description: 'e.g. USD' }, to: { type: 'string', description: 'e.g. EUR (several: EUR,GBP)' }, date: { type: 'string', description: 'YYYY-MM-DD, optional' } }, required: ['amount', 'from', 'to'] },
        run: async ({ amount, from, to, date }) => {
          const j = await getJSON(`https://api.frankfurter.app/${/^\d{4}-\d{2}-\d{2}$/.test(date || '') ? date : 'latest'}?amount=${Number(amount) || 1}&from=${encodeURIComponent(String(from).toUpperCase())}&to=${encodeURIComponent(String(to).toUpperCase())}`);
          return `${j.amount} ${j.base} on ${j.date}: ${Object.entries(j.rates || {}).map(([k, v]) => `${v} ${k}`).join(', ')} (ECB reference rate)`;
        } },
      { name: 'crypto_price', description: 'Current price, 24-hour change and market cap of cryptocurrencies.', parameters: { type: 'object', properties: { coins: { type: 'string', description: 'Names, e.g. bitcoin, ethereum, solana' }, currency: { type: 'string', description: 'e.g. usd (default)' } }, required: ['coins'] },
        run: async ({ coins, currency = 'usd' }) => {
          const ids = String(coins).toLowerCase().split(/[,\s]+/).filter(Boolean).map((c) => ({ btc: 'bitcoin', eth: 'ethereum', sol: 'solana', doge: 'dogecoin', xrp: 'ripple', ada: 'cardano' }[c] || c)).join(',');
          const cur = String(currency).toLowerCase();
          const j = await getJSON(`https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(ids)}&vs_currencies=${encodeURIComponent(cur)}&include_24hr_change=true&include_market_cap=true`);
          const lines = Object.entries(j).map(([id, v]) => `${id}: ${v[cur]} ${cur.toUpperCase()} (${(v[`${cur}_24h_change`] || 0).toFixed(2)}% in 24 h, market cap ${Math.round(v[`${cur}_market_cap`] || 0).toLocaleString('en-US')})`);
          return lines.join('\n') || `No coin found for ${coins}. Use full names like bitcoin, ethereum.`;
        } },
      { name: 'stock_quote', description: 'Latest daily stock price (open, high, low, close, volume) for a ticker, e.g. AAPL, MSFT, TSLA (US), or VOD.UK, SAP.DE.', parameters: { type: 'object', properties: { ticker: { type: 'string' } }, required: ['ticker'] },
        run: async ({ ticker }) => {
          const t = String(ticker || '').trim().toLowerCase(); const sym = /\.[a-z]{2}$/.test(t) ? t : `${t}.us`;
          const csv = await getText(`https://stooq.com/q/l/?s=${encodeURIComponent(sym)}&f=sd2t2ohlcv&h&e=csv`);
          const [head, row] = csv.trim().split('\n'); const h = head.split(','); const v = (row || '').split(',');
          if (!row || /N\/D/.test(row)) throw new Error(`No price found for ${ticker}.`);
          const o = Object.fromEntries(h.map((k, i) => [k.toLowerCase(), v[i]]));
          return `${String(ticker).toUpperCase()} ${o.date} ${o.time || ''}: close ${o.close}, open ${o.open}, high ${o.high}, low ${o.low}, volume ${Number(o.volume || 0).toLocaleString('en-US')} (Stooq, may be delayed)`;
        } },
    ],
    research: [
      { name: 'arxiv_search', description: 'Search research papers on arXiv (physics, maths, computer science, AI, biology…). Returns titles, authors, dates, abstracts and links.', parameters: { type: 'object', properties: { query: { type: 'string' }, max: { type: 'number' } }, required: ['query'] },
        run: async ({ query, max = 5 }) => {
          const xml = await getText(`https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(query)}&start=0&max_results=${Math.min(10, Number(max) || 5)}&sortBy=relevance`);
          const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map((m) => m[1]);
          const tag = (e, t) => decode((e.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`)) || [])[1] || '').replace(/\s+/g, ' ').trim();
          return entries.map((e, i) => `[${i + 1}] ${tag(e, 'title')} (${tag(e, 'published').slice(0, 10)})\n${[...e.matchAll(/<name>([^<]+)<\/name>/g)].slice(0, 4).map((m) => m[1]).join(', ')}\n${tag(e, 'id')}\n${tag(e, 'summary').slice(0, 600)}`).join('\n\n') || 'No papers found.';
        } },
      { name: 'pubmed_search', description: 'Search medical and life-science studies on PubMed. Returns titles, journals, dates and links.', parameters: { type: 'object', properties: { query: { type: 'string' }, max: { type: 'number' } }, required: ['query'] },
        run: async ({ query, max = 6 }) => {
          const s = await getJSON(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&retmode=json&retmax=${Math.min(10, Number(max) || 6)}&sort=relevance&term=${encodeURIComponent(query)}`);
          const ids = s.esearchresult?.idlist || [];
          if (!ids.length) return 'No studies found.';
          const sum = await getJSON(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&retmode=json&id=${ids.join(',')}`);
          return ids.map((id, i) => { const r = sum.result?.[id] || {}; return `[${i + 1}] ${r.title || ''}\n${(r.authors || []).slice(0, 3).map((a) => a.name).join(', ')} · ${r.fulljournalname || r.source || ''} · ${r.pubdate || ''}\nhttps://pubmed.ncbi.nlm.nih.gov/${id}/`; }).join('\n\n');
        } },
      { name: 'hackernews_search', description: 'Search Hacker News stories and discussions (tech, startups, programming).', parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] },
        run: async ({ query }) => {
          const j = await getJSON(`https://hn.algolia.com/api/v1/search?tags=story&hitsPerPage=8&query=${encodeURIComponent(query)}`);
          return (j.hits || []).map((h, i) => `[${i + 1}] ${h.title} (${h.points} points, ${h.num_comments} comments, ${String(h.created_at).slice(0, 10)})\n${h.url || ''}\nhttps://news.ycombinator.com/item?id=${h.objectID}`).join('\n\n') || 'No stories found.';
        } },
    ],
    maps: [
      { name: 'place_search', description: 'Find a place, address or business on OpenStreetMap: full address and coordinates.', parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] },
        run: async ({ query }) => {
          const j = await getJSON(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&q=${encodeURIComponent(query)}`);
          return j.map((p, i) => `[${i + 1}] ${p.display_name}\n${Number(p.lat).toFixed(5)}, ${Number(p.lon).toFixed(5)} · ${p.type}\nhttps://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lon}#map=16/${p.lat}/${p.lon}`).join('\n\n') || 'Nothing found.';
        } },
      { name: 'route', description: 'Driving distance and time between two places (names or addresses).', parameters: { type: 'object', properties: { from: { type: 'string' }, to: { type: 'string' } }, required: ['from', 'to'] },
        run: async ({ from, to }) => {
          const geo = async (q) => { const j = await getJSON(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(q)}`); if (!j[0]) throw new Error(`Couldn't find ${q}.`); return j[0]; };
          const a = await geo(from); await new Promise((r) => setTimeout(r, 1100)); const b = await geo(to); // OpenStreetMap asks for one search a second
          const r = await getJSON(`https://router.project-osrm.org/route/v1/driving/${a.lon},${a.lat};${b.lon},${b.lat}?overview=false`);
          const best = r.routes?.[0]; if (!best) throw new Error('No driving route found.');
          const h = Math.floor(best.duration / 3600); const m = Math.round((best.duration % 3600) / 60);
          return `${a.display_name.split(',')[0]} → ${b.display_name.split(',')[0]}: ${(best.distance / 1000).toFixed(1)} km (${(best.distance / 1609.344).toFixed(1)} miles), about ${h ? `${h} h ` : ''}${m} min by car (no live traffic).`;
        } },
    ],
    words: [
      { name: 'define_word', description: 'Definitions, pronunciation, examples and synonyms of an English word.', parameters: { type: 'object', properties: { word: { type: 'string' } }, required: ['word'] },
        run: async ({ word }) => {
          const j = await getJSON(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(String(word).trim())}`).catch(() => { throw new Error(`No dictionary entry for "${word}".`); });
          const e = j[0] || {};
          return [`${e.word} ${e.phonetic || e.phonetics?.find((p) => p.text)?.text || ''}`, ...(e.meanings || []).slice(0, 4).map((m) => `(${m.partOfSpeech}) ${m.definitions.slice(0, 2).map((d) => `${d.definition}${d.example ? ` e.g. "${d.example}"` : ''}`).join(' · ')}${m.synonyms?.length ? `\n  synonyms: ${m.synonyms.slice(0, 6).join(', ')}` : ''}`)].join('\n');
        } },
      { name: 'book_search', description: 'Find books by title, author or subject (Open Library): authors, first published, editions and links.', parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] },
        run: async ({ query }) => {
          const j = await getJSON(`https://openlibrary.org/search.json?limit=8&fields=title,author_name,first_publish_year,edition_count,key,subject&q=${encodeURIComponent(query)}`);
          return (j.docs || []).map((d, i) => `[${i + 1}] ${d.title} · ${(d.author_name || []).slice(0, 2).join(', ')} · first published ${d.first_publish_year || '?'} · ${d.edition_count || 0} editions\nhttps://openlibrary.org${d.key}`).join('\n\n') || 'No books found.';
        } },
    ],
    holidays: [
      { name: 'public_holidays', description: 'Public holidays for a country and year (country as a 2-letter code: US, GB, DE, IN…).', parameters: { type: 'object', properties: { country: { type: 'string' }, year: { type: 'number' } }, required: ['country'] },
        run: async ({ country, year }) => {
          const y = Number(year) || new Date().getFullYear();
          const j = await getJSON(`https://date.nager.at/api/v3/PublicHolidays/${y}/${encodeURIComponent(String(country).toUpperCase().slice(0, 2))}`);
          return j.map((h) => `${h.date} ${h.localName}${h.name !== h.localName ? ` (${h.name})` : ''}${h.global ? '' : ' (some regions)'}`).join('\n') || 'No holidays found.';
        } },
    ],
    pcfiles: [
      { name: 'files_find', description: 'Find files by name on this PC (Documents, Desktop, Downloads and added folders). Returns paths, sizes and dates.', parameters: { type: 'object', properties: { name: { type: 'string', description: 'Part of the file name, e.g. invoice or .pdf' }, folder: { type: 'string', description: 'Optional folder to look in' } }, required: ['name'] },
        run: async ({ name, folder }) => {
          const want = String(name || '').toLowerCase(); const starts = folder ? [allowed(folder)] : roots(); const out = [];
          const walk = (d, depth) => { if (out.length >= 40 || depth > 6) return; let es = []; try { es = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
            for (const e of es) { if (e.name.startsWith('.') || e.name === 'node_modules') continue; const p = path.join(d, e.name); if (e.isDirectory()) walk(p, depth + 1); else if (e.name.toLowerCase().includes(want)) { try { const st = fs.statSync(p); out.push(`${p} · ${(st.size / 1024).toFixed(0)} KB · ${st.mtime.toISOString().slice(0, 10)}`); } catch {} } } };
          for (const s of starts) walk(s, 0);
          return out.join('\n') || `No file name containing "${name}".`;
        } },
      { name: 'files_list', description: 'List what is in a folder on this PC.', parameters: { type: 'object', properties: { folder: { type: 'string' } }, required: ['folder'] },
        run: async ({ folder }) => { const d = allowed(folder); return fs.readdirSync(d, { withFileTypes: true }).slice(0, 200).map((e) => `${e.isDirectory() ? '📁' : '📄'} ${e.name}`).join('\n') || '(empty)'; } },
      { name: 'files_read', description: 'Read a text file on this PC (txt, md, csv, json, code; PDF and Word as text).', parameters: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] },
        run: async ({ path: p }) => {
          const f = allowed(p);
          if (/\.(pdf|docx|pptx|xlsx)$/i.test(f)) { const t = await require('./docs').extract(f); return String(t?.text ?? t ?? '').slice(0, 14000); }
          const st = fs.statSync(f); if (st.size > 2 * 1024 * 1024) throw new Error('That file is over 2 MB; open a smaller one.');
          return fs.readFileSync(f, 'utf8').slice(0, 14000);
        } },
      { name: 'files_save', description: 'Save text to a file on this PC (asks the user first). Will not overwrite unless overwrite is true.', write: true, parameters: { type: 'object', properties: { path: { type: 'string' }, text: { type: 'string' }, overwrite: { type: 'boolean' } }, required: ['path', 'text'] },
        summary: (a) => `Save ${String(a.text || '').length} characters to ${a.path}`,
        run: async ({ path: p, text, overwrite }) => { const f = allowed(p); if (fs.existsSync(f) && !overwrite) throw new Error(`${f} already exists. Ask before overwriting it.`); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, String(text ?? '')); return `Saved ${f}`; } },
    ],
    webshot: [
      { name: 'web_screenshot', description: 'Take a screenshot of a web page (or an app on this PC like http://localhost:3000) on a desktop or phone-sized screen, and save it as a picture.', parameters: { type: 'object', properties: { url: { type: 'string' }, device: { type: 'string', description: 'desktop (default) or phone' }, fullPage: { type: 'boolean' } }, required: ['url'] },
        run: async ({ url, device, fullPage }) => {
          const electron = require('electron'); if (typeof electron !== 'object' || !electron.BrowserWindow) throw new Error('Screenshots are taken inside Quicksilver.');
          const u = /^https?:\/\//.test(url) ? url : /^(localhost|127\.)/.test(url) ? `http://${url}` : `https://${url}`;
          if (isOffline() && !/^https?:\/\/(localhost|127\.0\.0\.1)/.test(u)) throw new Error('Quicksilver is offline: only an app on this PC can be captured.');
          const phone = /phone|mobile/i.test(device || ''); const [w, h] = phone ? [390, 844] : [1366, 900];
          const part = `shot-${Date.now()}`;
          const win = new electron.BrowserWindow({ show: false, width: w, height: h, webPreferences: { partition: part, sandbox: true, contextIsolation: true, offscreen: false } });
          try {
            win.webContents.setAudioMuted(true); win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
            await Promise.race([win.loadURL(u), new Promise((_, j) => setTimeout(() => j(new Error('The page took longer than 30 seconds.')), 30000))]).catch((e) => { if (!/ERR_ABORTED/.test(e.message)) throw e; });
            await new Promise((r) => setTimeout(r, 1500));
            if (fullPage) { const H = await win.webContents.executeJavaScript('Math.min(document.documentElement.scrollHeight, 8000)'); win.setContentSize(w, Math.max(h, H)); await new Promise((r) => setTimeout(r, 500)); }
            const img = await win.webContents.capturePage();
            const dir = path.join(require('./store').dir('media'), 'screenshots'); fs.mkdirSync(dir, { recursive: true });
            const f = path.join(dir, `${new URL(u).hostname.replace(/[^a-z0-9.-]/gi, '_')}-${phone ? 'phone' : 'desktop'}-${Date.now()}.png`);
            fs.writeFileSync(f, img.toPNG());
            return `Saved a ${phone ? 'phone' : 'desktop'} screenshot of ${u} (${img.getSize().width}×${img.getSize().height}): ${f}`;
          } finally { try { win.destroy(); } catch {} electron.session.fromPartition(part).clearStorageData().catch(() => {}); }
        } },
    ],
  };
  async function test() { return 'ready'; }
  return { CONNECTORS, TOOLS, test };
};
module.exports.calculate = calculate;
module.exports.convertUnits = convertUnits;
