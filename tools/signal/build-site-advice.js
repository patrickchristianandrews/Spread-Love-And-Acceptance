/* build-site-advice.js — the site's own suggested openers and scripts, kept as a guard set the Chat analyzer never flags.

   node tools/signal/build-site-advice.js --extract   re-reads the pages into tools/signal/site-advice.json
                                                      (quoted lines in "…-say", "…-script", "…-copy", "tol-try", <q> and
                                                      "Words you could use:" blocks; the "before" side of "A → B" and lines
                                                      under "Instead of" are left out)
   node tools/signal/build-site-advice.js             writes the hashes into assets/js/signal-engine.js (between the
                                                      site-advice markers)

   A line that carries a put-down, a threat, sarcasm, blame, control or the like is never added, even if a page quotes it:
   the builder lists those for a person to look at. Check with node tools/signal/test-site-advice.js. */
'use strict';
const fs = require('fs'), path = require('path');
const R = path.resolve(__dirname, '..', '..');
const JSONF = path.join(__dirname, 'site-advice.json');
const ENGINE = path.join(R, 'assets/js/signal-engine.js');

function strip(s) {
  return s.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&rsquo;|&#8217;/g, '’')
    .replace(/&lsquo;/g, '‘').replace(/&ldquo;/g, '“').replace(/&rdquo;/g, '”').replace(/&amp;/g, '&').replace(/&hellip;/g, '…')
    .replace(/&mdash;/g, '—').replace(/&ndash;/g, '–').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&rarr;/g, '→').replace(/\s+/g, ' ').trim();
}
const BAD = /\b(?:instead of|not:|avoid|don['’]t say|before:|harsh|sharper|what not to|won['’]t help|lands? as|sounds? like an? (?:order|attack)|blame|common trap|the trap|tempting|rather than|unhelpful|less helpful|try not|harder version|the sting)\b/i;

function extract() {
  const out = new Map();
  const files = fs.readdirSync(R).filter(f => f.endsWith('.html') && !/^(?:signal-translator|research|book|print|search|sitemap|404)/.test(f));
  const add = (q, src) => {
    q = q.replace(/^“|”$/g, '').trim();
    if (q.split(/\s+/).length < 4 || /…|\.\.\.|___/.test(q) || /[áéíóúñ¿¡]/.test(q)) return;
    if (/^(?:try this|in short|the short version|why it helps|before you share|share or print|upset right now\?)/i.test(q)) return;
    const k = q.toLowerCase(); if (!out.has(k)) out.set(k, { t: q, src });
  };
  for (const f of files) {
    const html = fs.readFileSync(path.join(R, f), 'utf8');
    const re = /<(p|div|li|blockquote|q|span|figure)\b[^>]*class="([^"]*)"[^>]*>([\s\S]*?)<\/\1>/g; let m;
    while ((m = re.exec(html))) {
      const cls = m[2];
      if (!/(?:^|[\s-])(?:say|script|copy|try|msg|fix|opener|words)(?:$|[\s-])/.test(cls) || /\b(?:try-this|nr-try|fo-try)\b/.test(cls)) continue;
      let t = strip(m[3]); if (!t || BAD.test(t)) continue;
      if (/→|->/.test(t)) t = t.split(/→|->/).slice(1).join(' ');
      const qs = t.match(/“[^”]{12,400}”/g) || (/[A-Za-z]/.test(t) && t.length < 300 && /[.?!]$/.test(t) ? [t] : []);
      qs.forEach(q => add(q, f + ' .' + cls.split(' ')[0]));
    }
    const re2 = /(?:Words you could use|Try saying|Try|Clearer|You could say|You could send|Say|Script|Opener|Something like)\s*:?\s*(?:<\/strong>|<\/b>)?\s*(?:&ldquo;|“)([^”<]{12,400})(?:&rdquo;|”)/g;
    while ((m = re2.exec(html))) { const ctx = strip(html.slice(Math.max(0, m.index - 200), m.index)); if (BAD.test(ctx.slice(-80))) continue; add(strip(m[1]), f + ' (inline)'); }
    const re3 = /<q\b[^>]*>([\s\S]*?)<\/q>/g;
    while ((m = re3.exec(html))) add(strip(m[1]), f + ' <q>');
  }
  const arr = [...out.values()].sort((a, b) => a.src.localeCompare(b.src));
  fs.writeFileSync(JSONF, JSON.stringify(arr, null, 1) + '\n');
  console.log('site-advice.json: ' + arr.length + ' lines from the pages');
}

// lines that may be quoted on a page but must never be waved through
const NEVER = ['harm', 'menace', 'control', 'label', 'contempt', 'swear', 'hostile', 'sarcasm', 'jab', 'legal', 'kidsfirst', 'guilt', 'dxlabel', 'violent', 'threat', 'madefeel', 'blameq', 'invalid', 'calm', 'passiveag', 'withdraw', 'stonewall', 'motive', 'tone', 'demand', 'vemo'];
function build() {
  const E = require(ENGINE);
  const arr = JSON.parse(fs.readFileSync(JSONF, 'utf8'));
  const keys = [], held = [];
  arr.forEach(o => {
    const an = E.analyze(o.t, { channel: 'text', noSiteAdvice: true });
    const bad = NEVER.filter(id => an.found[id]).concat(an.selfHarm ? ['self-harm'] : []);
    if (bad.length && !o.ok) { held.push(bad.join(',') + '  ' + o.src + '  ' + o.t); return; }
    keys.push(E.adviceKey(o.t));
    // the same opener without its first word of greeting ("Hey, can we…" -> "Can we…") is still the site's own
    const noHi = o.t.replace(/^(?:hey|hi|hello)[,!]?\s+/i, '');
    if (noHi !== o.t) keys.push(E.adviceKey(noHi));
    // each longer sentence of it too, so the opener still counts inside a longer message
    E.splitSentences(o.t).forEach(se => { const st = o.t.slice(se.s, se.e).trim(); if (st.split(/\s+/).length >= 6 && st !== o.t) keys.push(E.adviceKey(st)); });
  });
  const uniq = [...new Set(keys)].sort();
  let src = fs.readFileSync(ENGINE, 'utf8');
  const body = 'const SITE_ADVICE = new Set(' + JSON.stringify(uniq) + ');';
  src = src.replace(/(\/\* site-advice:start \*\/\n)[\s\S]*?(\n\/\* site-advice:end \*\/)/, '$1' + body + '$2');
  fs.writeFileSync(ENGINE, src);
  console.log('signal-engine.js: ' + uniq.length + ' guarded openers from ' + arr.length + ' lines');
  if (held.length) { console.log('\nLeft out (a page quotes them, but the words carry a put-down, threat, blame or similar; check by hand, or set "ok": true):'); held.forEach(x => console.log('  ' + x)); }
}
if (process.argv.includes('--extract')) extract(); else build();
