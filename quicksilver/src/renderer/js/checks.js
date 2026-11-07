// Accuracy and speed tricks that cost (almost) nothing:
//  1. Exact facts first: arithmetic, percentages, unit conversions and date gaps in the question
//     are worked out by the app and handed to the model, so small models don't get them wrong.
//  2. Maths audit: every "a × b = c" in an answer is recomputed; a wrong one gets fixed.
//  3. Code check: JavaScript and JSON are compiled (never run) and web pages are opened in a
//     hidden window; errors get fixed, once.
//  4. Unsure numbers get the double-check: the model's own confidence in each digit decides
//     whether a second model checks the answer, instead of checking everything or nothing.
//  5. Instant repeats: a question you've rated 👍 (or that passed the double-check) is answered
//     straight away from that answer.
//  6. Reading ahead: while you type, the model reads the conversation so far, so pressing Enter
//     only costs your new message.
'use strict';

// ---------- a tiny, safe calculator (numbers and + − × ÷ only) ----------
const NUM_SRC = '[£$€]?\\d[\\d,]*(?:\\.\\d+)?';
const OP_SRC = '\\s*[×x*\\/÷+\\-−]\\s*';
const num = (s) => Number(String(s).replace(/[£$€,\s]/g, ''));
function calc(expr) {
  const toks = String(expr).replace(/[×x]/g, '*').replace(/÷/g, '/').replace(/−/g, '-').match(/[£$€]?\d[\d,]*(?:\.\d+)?|[*/+-]/g);
  if (!toks || toks.length < 3 || toks.length % 2 === 0) return null;
  const vals = [num(toks[0])];
  const ops = [];
  for (let i = 1; i < toks.length; i += 2) {
    const op = toks[i]; const v = num(toks[i + 1]);
    if (op === '*' || op === '/') vals[vals.length - 1] = op === '*' ? vals.at(-1) * v : vals.at(-1) / v;
    else { ops.push(op); vals.push(v); }
  }
  let r = vals[0];
  ops.forEach((op, i) => { r = op === '+' ? r + vals[i + 1] : r - vals[i + 1]; });
  return Number.isFinite(r) ? r : null;
}
const fmtNum = (n) => (Math.abs(n) >= 1e15 ? String(n) : String(+n.toFixed(6)));
const stripCode = (t) => String(t || '').replace(/```[\s\S]*?(```|$)/g, ' ').replace(/`[^`\n]*`/g, ' ');

// ---------- 1. exact facts from the question ----------
const UNITS = [
  [/^(km|kilomet(?:er|re)s?)$/i, 'km', (v) => [v / 1.609344, 'miles']],
  [/^(miles?|mi)$/i, 'miles', (v) => [v * 1.609344, 'km']],
  [/^(kg|kilos?|kilograms?)$/i, 'kg', (v) => [v * 2.2046226, 'lb']],
  [/^(lbs?)$/i, 'lb', (v) => [v / 2.2046226, 'kg']],
  [/^(°\s?c|degrees? c(?:elsius)?|celsius)$/i, '°C', (v) => [v * 9 / 5 + 32, '°F']],
  [/^(°\s?f|degrees? f(?:ahrenheit)?|fahrenheit)$/i, '°F', (v) => [(v - 32) * 5 / 9, '°C']],
  [/^(cm|centimet(?:er|re)s?)$/i, 'cm', (v) => [v / 2.54, 'inches']],
  [/^(inch(?:es)?)$/i, 'inches', (v) => [v * 2.54, 'cm']],
  [/^(feet|foot|ft)$/i, 'feet', (v) => [v * 0.3048, 'metres']],
  [/^(met(?:er|re)s?)$/i, 'metres', (v) => [v / 0.3048, 'feet']],
  [/^(oz|ounces?)$/i, 'oz', (v) => [v * 28.349523, 'grams']],
  [/^(grams?)$/i, 'grams', (v) => [v / 28.349523, 'oz']],
];
const UNIT_RE = /(-?\d+(?:\.\d+)?)\s*(km|kilomet(?:er|re)s?|miles?|mi\b|kg|kilos?|kilograms?|lbs?|°\s?[cf]\b|degrees? (?:celsius|fahrenheit|c|f)\b|celsius|fahrenheit|cm|centimet(?:er|re)s?|inch(?:es)?|feet|foot|ft\b|met(?:er|re)s?\b|oz\b|ounces?|grams?)/gi;
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
const HOLIDAYS = { christmas: [11, 25], 'christmas day': [11, 25], 'new year': [0, 1], "new year's day": [0, 1], halloween: [9, 31], "valentine's day": [1, 14], valentines: [1, 14] };

function parseDay(s, base = new Date()) {
  const t = String(s).toLowerCase().trim().replace(/(\d)(st|nd|rd|th)\b/g, '$1');
  if (HOLIDAYS[t]) return HOLIDAYS[t];
  let m = t.match(/^(\d{1,2}) ([a-z]+)(?: (\d{4}))?$/) || null;
  if (m && MONTHS.indexOf(m[2]) >= 0) return [MONTHS.indexOf(m[2]), Number(m[1]), m[3] && Number(m[3])];
  m = t.match(/^([a-z]+) (\d{1,2})(?:,? (\d{4}))?$/);
  if (m && MONTHS.indexOf(m[1]) >= 0) return [MONTHS.indexOf(m[1]), Number(m[2]), m[3] && Number(m[3])];
  return null;
}

function exactFacts(text) {
  const t = stripCode(text);
  const out = [];
  const add = (s) => { if (!out.includes(s) && out.length < 6) out.push(s); };
  // Arithmetic written in the question (not ranges like 3-4, not dates like 7/11/2025).
  for (const m of t.matchAll(new RegExp(`(?<![\\w.\\/])(${NUM_SRC}(?:${OP_SRC}${NUM_SRC})+)(?![\\w.\\/])`, 'g'))) {
    const e = m[1];
    if (!/[×x*÷+]|\d\s*\/\s*\d/.test(e) || (e.match(/\//g) || []).length > 1 || /^\d{1,2}\s*[-\/]\s*\d{1,2}$/.test(e.trim())) continue;
    if (/[×x]/.test(e) && !/\d\s*[×x]\s*\d/.test(e)) continue;
    const r = calc(e);
    if (r != null) add(`${e.trim()} = ${fmtNum(r)}`);
  }
  for (const m of t.matchAll(/(\d+(?:\.\d+)?)\s*%\s*(of|off)\s*([£$€]?)(\d[\d,]*(?:\.\d+)?)/gi)) {
    const p = Number(m[1]); const v = num(m[4]);
    add(m[2].toLowerCase() === 'of' ? `${m[1]}% of ${m[3]}${m[4]} = ${m[3]}${fmtNum((p / 100) * v)}` : `${m[3]}${m[4]} with ${m[1]}% off = ${m[3]}${fmtNum(v * (1 - p / 100))}`);
  }
  for (const m of t.matchAll(UNIT_RE)) {
    const u = UNITS.find(([re]) => re.test(m[2].trim()));
    if (!u) continue;
    const [v2, to] = u[2](Number(m[1]));
    add(`${m[1]} ${u[1]} = ${fmtNum(Math.round(v2 * 100) / 100)} ${to}`);
  }
  // Dates: days until a day, and the weekday of a date.
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const until = t.match(/\bdays? (?:until|till|til|to|before|left (?:until|till|before))\s+([a-z' ]+?\d{0,2}(?:st|nd|rd|th)?(?: \d{4})?|\d{1,2}(?:st|nd|rd|th)? [a-z]+(?: \d{4})?)(?=[?.!,]|$)/i);
  if (until) {
    const d = parseDay(until[1]);
    if (d) {
      let date = new Date(d[2] || today.getFullYear(), d[0], d[1]);
      if (!d[2] && date < today) date = new Date(today.getFullYear() + 1, d[0], d[1]);
      add(`From today (${today.toDateString()}) to ${date.toDateString()} is ${Math.round((date - today) / 86400000)} days`);
    }
  }
  const wd = t.match(/\bwhat day (?:of the week )?(?:is|was|will be|does)\s+([^?]+?)(?: fall on| land on)?\?/i);
  if (wd) { const d = parseDay(wd[1].replace(/^the /i, '')); if (d) { const date = new Date(d[2] || today.getFullYear(), d[0], d[1]); add(`${date.toDateString()} is a ${date.toLocaleDateString('en-GB', { weekday: 'long' })}`); } }
  return out;
}

// ---------- 2. maths audit of an answer ----------
function mathAudit(text) {
  const t = stripCode(text);
  const bad = [];
  const re = new RegExp(`(?<![\\w.\\/])(${NUM_SRC}(?:${OP_SRC}${NUM_SRC})+)\\s*=\\s*([£$€]?-?\\d[\\d,]*(?:\\.\\d+)?)(?![\\d.,]*\\s*[×x*\\/÷]\\s*\\d)`, 'g');
  for (const m of t.matchAll(re)) {
    const e = m[1];
    if ((e.match(/\//g) || []).length > 1 || (/[×x]/.test(e) && !/\d\s*[×x]\s*\d/.test(e))) continue;
    const r = calc(e);
    if (r == null) continue;
    const stated = num(m[2]);
    const dec = (m[2].split('.')[1] || '').length;
    const tol = 0.5 * 10 ** -dec + Math.abs(r) * 1e-9 + 1e-9;
    if (Math.abs(r - stated) > tol && !(dec === 0 && Math.abs(r - stated) <= 0.5)) bad.push(`"${e.trim()} = ${m[2]}" is wrong: ${e.trim()} = ${fmtNum(r)}.`);
    if (bad.length >= 5) break;
  }
  return bad;
}

// ---------- 3. code check (compile only, never run) and web page check ----------
async function codeAudit(text) {
  const blocks = [...String(text || '').matchAll(/```(js|javascript|mjs|cjs|json)\s*\n([\s\S]*?)```/gi)].map((m) => ({ lang: m[1].toLowerCase(), code: m[2] })).slice(0, 6);
  const out = [];
  if (blocks.length) { try { out.push(...(await qs.call('code:check', blocks))); } catch {} }
  const html = appHtmlOf(text);
  if (html && /<script\b/i.test(html) && /<!doctype html|<html[\s>]/i.test(html)) {
    try { const errs = await qs.call('page:check', html); if (errs.length) out.push(`When the web page is opened, it shows these JavaScript errors: ${errs.slice(0, 4).join(' | ')}`); } catch {}
  }
  return out;
}

// Runs after an answer; returns true when it started a corrected answer.
async function autoChecks(chat, msg, alt) {
  if (S.data.prefs.autoFix === false || alt.fixed || msg.autoFixed || alt.cached || !alt.text || alt.error) return false;
  // Practice questions: the worked answers inside them are audited too.
  const quizWhy = [...String(alt.text).matchAll(/```quiz\s*\n([\s\S]*?)```/g)].map((m) => (parseQuiz(m[1])?.questions || []).map((q) => q.why || '').join('\n')).join('\n');
  const findings = [...mathAudit(alt.text), ...mathAudit(quizWhy), ...(await codeAudit(alt.text))];
  alt.audit = { math: true, findings: findings.length };
  if (!findings.length || pending || chat.messages.at(-1) !== msg || msg.alts[msg.altIndex] !== alt) return false;
  msg.autoFixed = true;
  alt.auditFindings = findings;
  learnSignal(jobOfMsg(chat, msg), alt.target, 'down', 1);
  toast(findings[0].startsWith('"') ? 'A sum in the answer was wrong, so it\'s being corrected.' : 'The code had an error, so it\'s being fixed.');
  generate(chat, msg, alt.target, { fix: findings.map((f) => `- ❌ ${f}`).join('\n') });
  return true;
}

// ---------- 4. unsure numbers get the double-check ----------
function unsureCheck(chat, msg, alt) {
  const a = assistantById(chat.assistantId);
  if (S.data.prefs.checkUnsure === false || alt.minDigitP == null || alt.minDigitP >= 0.35 || effortOf(chat, a) === 'quick' || factOn(chat, a) || alt.check) return false;
  const checker = pickChecker(alt.target);
  if (!checker || checker === alt.target) return false;
  alt.unsure = true;
  factCheck(chat, msg, alt, []);
  return true;
}

// ---------- 5. instant repeats ----------
const cacheKey = (chat, text) => `${chat.assistantId}|${String(text || '').toLowerCase().replace(/[^a-z0-9£$€%]+/g, ' ').trim()}`;
function cacheable(chat, q) { return !assistantById(chat.assistantId)?.exam && q?.text && q.text.length <= 600 && !(q.attachments || []).length && !q.skillId && !chat.private && !FRESH_Q.test(q.text) && chat.messages.indexOf(q) === 0; }
function rememberAnswer(chat, msg, alt) {
  const q = chat.messages[chat.messages.indexOf(msg) - 1];
  if (!cacheable(chat, q) || !alt.text || alt.cached) return;
  const c = (S.data.answerCache ||= {});
  c[cacheKey(chat, q.text)] = { text: alt.text, target: alt.target, t: now() };
  const keys = Object.keys(c);
  if (keys.length > 300) keys.sort((x, y) => c[x].t - c[y].t).slice(0, keys.length - 300).forEach((k) => delete c[k]);
}
function forgetAnswer(chat, msg) {
  const q = chat.messages[chat.messages.indexOf(msg) - 1];
  if (q?.text && S.data.answerCache) delete S.data.answerCache[cacheKey(chat, q.text)];
}
function cachedAnswer(chat, q) {
  if (!cacheable(chat, q) || S.data.prefs.instantRepeats === false) return null;
  const hit = S.data.answerCache?.[cacheKey(chat, q.text)];
  return hit && Date.now() - hit.t < 30 * 86400000 && targetValid(hit.target) ? hit : null;
}

// ---------- 6. reading ahead while you type ----------
const prefilled = new Map(); // chat id -> what was last read ahead
function prefillChat(chat, a, text) {
  if (pending || S.data.prefs.readAhead === false || String(text || '').trim().length < 3) return;
  const target = autoOn(chat, a) ? autoPick(chat, a, text, (drafts[chat.id] || []).some((x) => x.type === 'image')).target : resolveTarget(chat, a);
  if (!target || target.startsWith('api:')) return;
  const { messages, ctx } = chatHistory(chat, a, chat.messages.length);
  const sig = `${target}|${chat.messages.length}|${chat.messages.at(-1)?.id || ''}|${messages[0].content.length}`;
  if (prefilled.get(chat.id) === sig) return;
  prefilled.set(chat.id, sig);
  qs.call('models:prefill', target, messages, { contextSize: ctx, gpu: S.data.prefs.gpu }).catch(() => prefilled.delete(chat.id));
}

// ---------- 7. the likely next question, answered while you read ----------
// After an answer, the top follow-up suggestion is answered in the background (local models only,
// and only when it needs no web or Library search). Click it and the answer is already there.
// Anything you send stops this work at once.
function preanswer(chat, msg, alt) {
  const p = S.data.prefs;
  const a = assistantById(chat.assistantId);
  const q = alt.followups?.[0];
  if (p.preanswer === false || !q || pending || alt.pre || chat.messages.at(-1) !== msg || FRESH_Q.test(q) || effortOf(chat, a) === 'max') return;
  let target = resolveTarget(chat, a);
  if (autoOn(chat, a)) target = autoPick(chat, a, q, false).target || target;
  if (!target || target.startsWith('api:') || webWanted(chat, a, q) || (chat.library ?? a.library) || toolsOn(chat, a)) return;
  const { messages, ctx, strict } = chatHistory(chat, a, chat.messages.length);
  const facts = exactFacts(q);
  messages.push({ role: 'user', content: withContext(q, turnContext(chat, [], strict, q, ctx, facts.length ? `Exact results worked out by the app for this question (use these numbers as they are):\n${facts.map((f) => `- ${f}`).join('\n')}` : '', '')) });
  const requestId = uid();
  alt.pre = { q, target, text: '', done: false };
  bgJobs.add(requestId);
  oneShots.set(requestId, {
    text: '',
    resolve: (t) => { bgJobs.delete(requestId); if (alt.pre) { alt.pre.text = t || ''; alt.pre.done = Boolean(t); } },
    reject: () => { bgJobs.delete(requestId); delete alt.pre; },
  });
  qs.sendChat({ requestId, target, messages, temperature: Number(chat.temperature ?? a.temperature ?? p.temperature), maxTokens: Number(chat.maxTokens || a.maxTokens || p.maxTokens) || 2048, contextSize: ctx, level: effortOf(chat, a), gpu: p.gpu, effort: p.effort });
}
// Used by generate(): the question you sent is the one answered in advance.
function takePreanswer(chat) {
  const q = chat.messages.at(-1);
  const prev = chat.messages.at(-2);
  const pa = prev?.role === 'assistant' && prev.alts[prev.altIndex];
  if (!pa?.pre?.done || !pa.pre.text || q?.role !== 'user' || (q.attachments || []).length || pa.pre.q.trim() !== String(q.text || '').trim()) return null;
  const pre = pa.pre;
  delete pa.pre;
  return pre;
}

// ---------- 8. the model is ready before the first question ----------
// At start-up, the usual model loads in the background and reads the assistant's instructions.
function preloadDefault() {
  if (S.data.prefs.preload === false || !S.data?.assistants?.length) return;
  const a = assistantById(S.data.prefs.lastAssistant) || S.data.assistants[0];
  const target = a.target || S.data.prefs.defaultTarget;
  if (!target || target.startsWith('api:') || !targetValid(target)) return;
  qs.call('models:prefill', target, [{ role: 'system', content: systemPrompt(a, false, {}) }], { contextSize: Number(a.contextSize || S.data.prefs.contextSize) || 16384, gpu: S.data.prefs.gpu }).catch(() => {});
}

// Which kind of question an answer was for (for learning which model suits what).
function jobOfMsg(chat, msg) {
  const q = chat.messages[chat.messages.indexOf(msg) - 1];
  return jobOfQuestion(q?.text || '', assistantById(chat.assistantId));
}
