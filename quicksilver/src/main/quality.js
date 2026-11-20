// Objective model benchmarking. Runs a model on public eval sets with VERIFIABLE answers and scores
// it, so quality is measured, not guessed. Three sets: GSM8K (math), IFEval (instruction-following),
// HumanEval (code). Data is pulled free from the Hugging Face datasets-server (/rows) at run time, no
// key. Grading is done here: a number match for GSM8K, instruction verifiers for IFEval, and running
// the generated function against its unit tests (in an isolated python subprocess) for HumanEval.
'use strict';
const os = require('node:os');
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');

const DS = 'https://datasets-server.huggingface.co/rows';
const SETS = {
  gsm8k: { label: 'GSM8K · math', dataset: 'openai/gsm8k', config: 'main', split: 'test', total: 1319, needsPython: false },
  ifeval: { label: 'IFEval · instructions', dataset: 'google/IFEval', config: 'default', split: 'train', total: 541, needsPython: false },
  humaneval: { label: 'HumanEval · code', dataset: 'openai/openai_humaneval', config: 'openai_humaneval', split: 'test', total: 164, needsPython: true },
};

async function fetchRows(set, offset, length) {
  const s = SETS[set];
  const url = `${DS}?dataset=${encodeURIComponent(s.dataset)}&config=${s.config}&split=${s.split}&offset=${offset}&length=${length}`;
  const r = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw new Error(`Couldn't load ${s.label} data (HTTP ${r.status}). Check the internet.`);
  const j = await r.json();
  return (j.rows || []).map((x) => x.row);
}
// A spread-out random sample (the datasets-server pages by offset).
async function sample(set, n) {
  const s = SETS[set];
  const offset = Math.floor(Math.random() * (Math.max(0, s.total - n) + 1));
  return fetchRows(set, offset, n);
}

function promptFor(set, row) {
  if (set === 'gsm8k') return `Solve this math problem. Show brief working, then end with a line "#### <final number>".\n\n${row.question}`;
  if (set === 'ifeval') return row.prompt;
  if (set === 'humaneval') return `Complete this Python function. Reply with ONLY the full function code (including the def line), no explanation, no markdown fences.\n\n${row.prompt}`;
  return '';
}

// ---------------- grading ----------------
function lastNumber(s) { const m = String(s).replace(/(\d),(\d)/g, '$1$2').match(/-?\d+(?:\.\d+)?/g); return m ? m[m.length - 1] : null; }
function gradeGsm(row, out) {
  const goldSeg = String(row.answer).includes('####') ? String(row.answer).split('####')[1] : row.answer;
  const outSeg = out.includes('####') ? out.split('####').pop() : out;
  const gold = lastNumber(goldSeg), got = lastNumber(outSeg);
  return gold != null && got != null && Number(gold) === Number(got);
}

// IFEval — a solid subset of the official verifiers. Unsupported instructions are skipped (not counted).
const WORDS = (t) => (String(t).trim().match(/\b[\w'-]+\b/g) || []);
const SENTS = (t) => (String(t).replace(/\n/g, ' ').match(/[^.!?]+[.!?]+/g) || []).filter((x) => x.trim().length);
const PARAS = (t) => String(t).split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean);
function ifCheck(id, kw, out) {
  const t = String(out);
  const K = kw || {};
  switch (id) {
    case 'keywords:existence': return { ok: (K.keywords || []).every((k) => new RegExp(`\\b${escapeRe(k)}\\b`, 'i').test(t)) };
    case 'keywords:frequency': { const c = (t.match(new RegExp(`\\b${escapeRe(K.keyword)}\\b`, 'gi')) || []).length; const r = K.relation; return { ok: r === 'at least' ? c >= K.frequency : r === 'less than' ? c < K.frequency : c === K.frequency }; }
    case 'keywords:forbidden_words': return { ok: (K.forbidden_words || []).every((k) => !new RegExp(`\\b${escapeRe(k)}\\b`, 'i').test(t)) };
    case 'length_constraints:number_words': { const c = WORDS(t).length; const r = K.relation; return { ok: r === 'at least' ? c >= K.num_words : r === 'less than' ? c < K.num_words : true }; }
    case 'length_constraints:number_sentences': { const c = SENTS(t).length; const r = K.relation; return { ok: r === 'at least' ? c >= K.num_sentences : r === 'less than' ? c < K.num_sentences : c === K.num_sentences }; }
    case 'length_constraints:number_paragraphs': { const c = PARAS(t).length; return { ok: c === K.num_paragraphs }; }
    case 'change_case:english_lowercase': return { ok: t === t.toLowerCase() };
    case 'change_case:english_capital': return { ok: t === t.toUpperCase() };
    case 'change_case:capital_word_frequency': { const caps = (t.match(/\b[A-Z][A-Z]+\b/g) || []).length; const r = K.capital_relation; return { ok: r === 'at least' ? caps >= K.capital_frequency : r === 'less than' ? caps < K.capital_frequency : caps === K.capital_frequency }; }
    case 'punctuation:no_comma': return { ok: !t.includes(',') };
    case 'startend:end_checker': return { ok: t.trim().endsWith(String(K.end_phrase || '').trim()) };
    case 'startend:quotation': return { ok: /^\s*".*"\s*$/s.test(t.trim()) };
    case 'detectable_format:number_bullet_lists': { const c = (t.match(/^\s*[*-]\s+/gm) || []).length; return { ok: c === K.num_bullets }; }
    case 'detectable_format:number_highlighted_sections': { const c = (t.match(/\*[^*\n]+\*/g) || []).length; return { ok: c >= K.num_highlights }; }
    case 'detectable_format:title': return { ok: /<<[^>\n]+>>/.test(t) };
    case 'detectable_format:json_format': { try { JSON.parse(t.trim().replace(/^```(json)?|```$/g, '')); return { ok: true }; } catch { return { ok: false }; } }
    case 'detectable_content:number_placeholders': { const c = (t.match(/\[[^\]\n]+\]/g) || []).length; return { ok: c >= K.num_placeholders }; }
    case 'detectable_content:postscript': return { ok: new RegExp(escapeRe(K.postscript_marker || 'P.S.'), 'i').test(t) };
    default: return { ok: null }; // unsupported → not counted
  }
}
function escapeRe(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function gradeIfeval(row, out) {
  const ids = row.instruction_id_list || [];
  const kwargs = row.kwargs || [];
  let supported = 0, passed = 0;
  ids.forEach((id, i) => { const r = ifCheck(id, kwargs[i], out); if (r.ok === null) return; supported++; if (r.ok) passed++; });
  return { supported, passed };
}

// HumanEval — run the generated function + the dataset's unit tests in an isolated python subprocess.
let PY = undefined;
function python() {
  if (PY !== undefined) return PY;
  for (const p of ['python3', 'python']) { try { cp.execSync(`${p} --version`, { stdio: 'ignore' }); PY = p; return p; } catch { /* next */ } }
  PY = null; return null;
}
function extractCode(out, entry) {
  let c = String(out);
  const fence = c.match(/```(?:python)?\s*([\s\S]*?)```/i); if (fence) c = fence[1];
  // If the model didn't include the def line, the caller prepends the prompt.
  return c.trim();
}
function gradeHuman(row, out) {
  const py = python();
  if (!py) return { ok: null, note: 'no-python' };
  let code = extractCode(out, row.entry_point);
  if (!new RegExp(`def\\s+${escapeRe(row.entry_point)}\\b`).test(code)) code = row.prompt + '\n' + code; // prepend signature
  const program = `${code}\n\n${row.test}\n\ncheck(${row.entry_point})\n`;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qs-he-'));
  const file = path.join(dir, 'prog.py');
  try {
    fs.writeFileSync(file, program);
    cp.execFileSync(py, ['-I', '-S', '-B', file], { cwd: dir, timeout: 12000, stdio: 'ignore', env: { PATH: process.env.PATH } });
    return { ok: true };
  } catch { return { ok: false }; }
  finally { try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* ignore */ } }
}

function grade(set, row, out) {
  if (set === 'gsm8k') return gradeGsm(row, out) ? { correct: 1, of: 1 } : { correct: 0, of: 1 };
  if (set === 'ifeval') { const r = gradeIfeval(row, out); return { correct: r.passed, of: r.supported }; }
  if (set === 'humaneval') { const r = gradeHuman(row, out); return r.ok === null ? { correct: 0, of: 0, skipped: r.note } : { correct: r.ok ? 1 : 0, of: 1 }; }
  return { correct: 0, of: 0 };
}

// ---------------- run a model across the chosen sets ----------------
async function collect(single, target, prompt, maxTokens) {
  let text = '';
  for await (const ev of single(target, { messages: [{ role: 'user', content: prompt }], temperature: 0, maxTokens, level: 'quick' })) {
    if ((ev.type === 'text' || ev.type === 'reasoning') && ev.text) text += ev.text;
  }
  return text;
}
// { single, target, sets[], n, onProgress } -> { set: { label, correct, of, skipped, pct, score/10 } }
async function run({ single, target, sets, n, onProgress }) {
  const out = {};
  for (const set of sets) {
    if (!SETS[set]) continue;
    if (SETS[set].needsPython && !python()) { out[set] = { label: SETS[set].label, pct: null, score: null, unavailable: 'Needs Python installed to grade code.' }; continue; }
    let rows;
    try { rows = await sample(set, n); } catch (e) { out[set] = { label: SETS[set].label, pct: null, score: null, error: e.message }; continue; }
    let correct = 0, of = 0, skipped = 0;
    for (let i = 0; i < rows.length; i++) {
      if (onProgress) onProgress({ set, label: SETS[set].label, done: i, total: rows.length });
      let ans = '';
      try { ans = await collect(single, target, promptFor(set, rows[i]), set === 'humaneval' ? 900 : set === 'ifeval' ? 1100 : 600); }
      catch { continue; }
      const g = grade(set, rows[i], ans);
      if (g.skipped) { skipped++; continue; }
      correct += g.correct; of += g.of;
    }
    const pct = of ? Math.round((correct / of) * 100) : null;
    out[set] = { label: SETS[set].label, correct, of, skipped, pct, score: pct == null ? null : Math.round(pct / 10 * 10) / 10 };
    if (onProgress) onProgress({ set, label: SETS[set].label, done: rows.length, total: rows.length });
  }
  return out;
}

module.exports = { SETS, fetchRows, sample, promptFor, grade, gradeGsm, gradeIfeval, gradeHuman, python, lastNumber, run, collect };
