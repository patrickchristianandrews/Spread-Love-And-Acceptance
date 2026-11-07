// Exam coaches: CPA and CIA study courses in the chat. They follow the official, public exam
// outlines (the AICPA CPA Exam Blueprints and the IIA CIA exam syllabus) and teach the way good
// review courses do: short lessons, lots of practice questions with an explanation of every
// answer (including why each wrong choice is wrong), task-based simulations, a study plan, and
// your weak spots drilled until they aren't. Practice questions are interactive: pick an
// answer, see the explanation, and your score per topic is kept so the coach knows what to
// work on next. Your own course books or notes (added to the Library) are used and cited.
'use strict';

const EXAMS = {
  CPA: {
    name: 'CPA Exam', org: 'AICPA Uniform CPA Examination Blueprints',
    sections: {
      AUD: { name: 'Auditing and Attestation', core: true, areas: ['Ethics, professional responsibilities and general principles', 'Assessing risk and developing a planned response', 'Performing further procedures and obtaining evidence', 'Forming conclusions and reporting'] },
      FAR: { name: 'Financial Accounting and Reporting', core: true, areas: ['Financial reporting (incl. not-for-profit and state and local government)', 'Select balance sheet accounts', 'Select transactions'] },
      REG: { name: 'Taxation and Regulation', core: true, areas: ['Ethics, professional responsibilities and federal tax procedures', 'Business law', 'Federal taxation of property transactions', 'Federal taxation of individuals', 'Federal taxation of entities'] },
      BAR: { name: 'Business Analysis and Reporting (discipline)', areas: ['Business analysis', 'Technical accounting and reporting', 'State and local governments'] },
      ISC: { name: 'Information Systems and Controls (discipline)', areas: ['Information systems and data management', 'Security, confidentiality and privacy', 'Considerations for SOC engagements'] },
      TCP: { name: 'Tax Compliance and Planning (discipline)', areas: ['Individual tax compliance and planning, personal financial planning', 'Entity tax compliance', 'Entity tax planning', 'Property transactions'] },
    },
  },
  CIA: {
    name: 'CIA Exam', org: 'IIA Certified Internal Auditor exam syllabus (aligned with the Global Internal Audit Standards)',
    sections: {
      'Part 1': { name: 'Essentials of Internal Auditing', areas: ['Foundations of internal auditing', 'Ethics and professionalism', 'Governance, risk management and control', 'Fraud risk'] },
      'Part 2': { name: 'Practice of Internal Auditing', areas: ['Internal audit operations', 'Engagement planning', 'Engagement performance', 'Engagement results and monitoring'] },
      'Part 3': { name: 'Business Knowledge for Internal Auditing', areas: ['Business acumen', 'Information security', 'Information technology', 'Financial management'] },
    },
  },
};

const QUIZ_FORMAT = 'Practice questions go in a ```quiz code block containing only JSON: {"exam": "CPA" or "CIA", "section": "FAR" (or "Part 2" etc.), "topic": "the topic", "questions": [{"q": "the question (with any numbers needed)", "choices": ["…", "…", "…", "…"], "answer": index of the correct choice (0-3), "why": "why the correct answer is right, with the working for any calculation", "wrong": ["why choice 1 is wrong or right", "…", "…", "…"], "topic": "sub-topic"}]}. The app shows the questions one at a time with buttons, reveals your explanations after each pick and keeps the learner\'s score, so do NOT print the questions or answers again outside the block. Write 5 questions unless asked otherwise. Use exactly 4 choices, make the wrong choices plausible (common mistakes), vary the position of the correct answer, and double-check every answer key and calculation before writing it.';

function examInstructions(exam) {
  const e = EXAMS[exam];
  const outline = Object.entries(e.sections).map(([k, s]) => `- ${k}: ${s.name}${s.core === true ? ' (core)' : ''}. Areas: ${s.areas.join('; ')}.`).join('\n');
  return `You are an expert ${e.name} coach: an experienced instructor who has helped thousands of candidates pass. You teach to the official ${e.org}:
${outline}

How you teach:
- Lessons: short and exam-focused. Key rules and definitions, a worked example with numbers, the classic traps examiners use, and a memory aid. End with "Ready for practice questions?".
- Practice: exam-style multiple-choice questions at real exam difficulty. ${QUIZ_FORMAT}
${exam === 'CPA' ? '- Task-based simulations: when asked for a simulation (TBS), give a realistic scenario with exhibits (tables of figures, documents), then the tasks (journal entries, calculations, research, document review), and wait for the learner\'s answers before marking them with full explanations and a score.\n' : ''}- Study plan: ask for the exam date, hours per week and sections, then give a week-by-week plan (lessons, practice, review, final review and a full practice exam), weighted to the outline and to the learner's weak areas.
- Weak spots: the learner's practice results are given to you with each message. Focus on the weakest topics, re-teach what they got wrong in a new way, then test it again.
- Accuracy: follow current US GAAP, the Internal Revenue Code, AICPA standards, PCAOB standards and the IIA Global Internal Audit Standards as applicable. If a figure (like a tax limit) changes yearly, say which year it applies to. Show working for every calculation and check it. If the learner's own course materials are in the reference material, follow them and cite them.
- Never claim to be, or to contain the materials of, any commercial review course. Be encouraging, direct and efficient: the learner's time matters.`;
}

const EXAM_ASSISTANTS = [
  { id: 'as-cpa', job: 'reasoning', exam: 'CPA', name: 'CPA Exam Coach', emoji: '📘', description: 'Your CPA review course: AUD, FAR, REG and BAR, ISC or TCP. Lessons, interactive practice questions, simulations, a study plan and your weak spots tracked.', temperature: 0.3, factCheck: true, maxTokens: 4096, instructions: examInstructions('CPA') },
  { id: 'as-cia', job: 'reasoning', exam: 'CIA', name: 'CIA Exam Coach', emoji: '📗', description: 'Your CIA review course: Parts 1, 2 and 3 on the Global Internal Audit Standards. Lessons, interactive practice questions, a study plan and your weak spots tracked.', temperature: 0.3, factCheck: true, maxTokens: 4096, instructions: examInstructions('CIA') },
];

// ---------- interactive practice questions ----------
function quizHash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }
function parseQuiz(code) {
  try {
    const j = JSON.parse(String(code).trim().replace(/,\s*([}\]])/g, '$1'));
    const qs0 = (j.questions || []).filter((q) => q && q.q && Array.isArray(q.choices) && q.choices.length >= 2 && Number.isInteger(Number(q.answer)) && Number(q.answer) >= 0 && Number(q.answer) < q.choices.length);
    return qs0.length ? { ...j, questions: qs0 } : null;
  } catch { return null; }
}
function quizHTML(code) {
  const qz = parseQuiz(code);
  if (!qz) return '';
  const id = quizHash(code);
  quizCodes.set(id, code);
  const st = S.data?.quiz?.[id] || {};
  const done = qz.questions.filter((_, i) => st[i] != null).length;
  const right = qz.questions.filter((q, i) => st[i] != null && Number(st[i]) === Number(q.answer)).length;
  const cur = qz.questions.findIndex((_, i) => st[i] == null);
  const L = 'ABCDEF';
  const card = (q, i) => {
    const pick = st[i];
    const ans = Number(q.answer);
    return `<div class="qz ${pick != null ? 'done' : ''}" data-qz="${id}" data-i="${i}">
      <div class="qz-q"><span class="qz-n">${i + 1}</span>${esc(q.q)}</div>
      <div class="qz-choices">${q.choices.map((c, k) => `<button class="qz-c ${pick != null ? (k === ans ? 'right' : k === Number(pick) ? 'wrong' : 'dim') : ''}" data-qz-pick="${id}" data-i="${i}" data-k="${k}" ${pick != null ? 'disabled' : ''}><b>${L[k]}</b><span>${esc(String(c).replace(/^[A-F][).:]\s*/, ''))}</span></button>`).join('')}</div>
      ${pick != null ? `<div class="qz-why ${Number(pick) === ans ? 'ok' : 'bad'}"><b>${Number(pick) === ans ? '✓ Correct.' : `✗ The answer is ${L[ans]}.`}</b> ${esc(q.why || '')}${Number(pick) !== ans && q.wrong?.[pick] ? `<div class="small muted" style="margin-top:4px">Your choice (${L[pick]}): ${esc(q.wrong[pick])}</div>` : ''}</div>` : ''}
    </div>`;
  };
  // One question at a time: answered ones stay above, the next one appears after each pick.
  const shown = qz.questions.map((q, i) => (st[i] != null || i === cur ? card(q, i) : '')).join('');
  return `<div class="quiz" data-quiz="${id}">
    <div class="quiz-h"><span>📝 ${esc([qz.exam, qz.section, qz.topic].filter(Boolean).join(' · ') || 'Practice')}</span><span class="grow"></span><span class="small muted">${done ? `${right} / ${done} correct` : `${qz.questions.length} questions`}</span></div>
    ${shown}
    ${cur < 0 ? `<div class="quiz-end"><b>${right} of ${qz.questions.length} correct (${Math.round((right / qz.questions.length) * 100)}%).</b> <button class="btn small primary" data-qz-next="${id}">More on my weak spots</button><button class="btn small" data-qz-explain="${id}">Explain what I missed</button></div>` : ''}
  </div>`;
}

function recordQuiz(id, i, k) {
  const code = quizCodes.get(id);
  const qz = code && parseQuiz(code);
  if (!qz) return;
  const q = qz.questions[i];
  const st = ((S.data.quiz ||= {})[id] ||= {});
  if (st[i] != null) return;
  st[i] = k;
  const ok = Number(k) === Number(q.answer);
  const key = [qz.exam || '?', qz.section || '?', q.topic || qz.topic || 'General'].join('|');
  const rec = ((S.data.study ||= {})[key] ||= { right: 0, wrong: 0 });
  rec[ok ? 'right' : 'wrong']++; rec.last = now();
  save();
}
// The quiz JSON by id (filled as quizzes are rendered), so answers can be scored.
const quizCodes = new Map();

function studyStats(exam) {
  return Object.entries(S.data.study || {}).filter(([k]) => k.startsWith(`${exam}|`)).map(([k, v]) => { const [, section, topic] = k.split('|'); const n = v.right + v.wrong; return { section, topic, ...v, n, pct: n ? v.right / n : 0 }; });
}
function weakTopics(exam, n = 4) {
  return studyStats(exam).filter((x) => x.n >= 2).sort((a, b) => a.pct - b.pct || b.n - a.n).slice(0, n).filter((x) => x.pct < 0.8);
}
// Sent with each message to an exam coach, so it knows what to work on.
function studyContext(a) {
  if (!a?.exam) return '';
  const s = studyStats(a.exam);
  if (!s.length) return `The learner's practice results: none yet (${a.exam}).`;
  const by = {};
  for (const x of s) { by[x.section] ||= { r: 0, n: 0 }; by[x.section].r += x.right; by[x.section].n += x.n; }
  const weak = weakTopics(a.exam);
  return `The learner's practice results (${a.exam}): ${Object.entries(by).map(([k, v]) => `${k} ${v.r}/${v.n}`).join(', ')}.${weak.length ? ` Weakest topics: ${weak.map((w) => `${w.section} ${w.topic} (${w.right}/${w.n})`).join('; ')}.` : ''}`;
}

function studyPanelHTML(a) {
  const e = EXAMS[a.exam];
  if (!e) return '';
  const s = studyStats(a.exam);
  const by = {};
  for (const x of s) { by[x.section] ||= { r: 0, n: 0 }; by[x.section].r += x.right; by[x.section].n += x.n; }
  const weak = weakTopics(a.exam, 3);
  return `<div class="study">
    <div class="study-secs">${Object.entries(e.sections).map(([k, sec]) => { const v = by[k]; const pct = v?.n ? Math.round((v.r / v.n) * 100) : null; return `<button class="study-sec" data-study="${esc(k)}" title="${esc(sec.name)}: ${esc(sec.areas.join('; '))}"><b>${esc(k)}</b><span class="small muted">${esc(sec.name.replace(/ \(discipline\)/, ''))}</span><span class="study-bar"><i style="width:${pct ?? 0}%"></i></span><span class="small">${pct == null ? 'Not started' : `${pct}% · ${v.n} answered`}</span></button>`; }).join('')}</div>
    <div class="row study-go">${weak.length ? `<button class="btn small primary" data-study-weak>Practise my weak spots (${esc(weak.map((w) => w.topic).join(', '))})</button>` : ''}<button class="btn small" data-study-plan>Make my study plan</button>${a.exam === 'CPA' ? '<button class="btn small" data-study-sim>Task-based simulation</button>' : ''}</div>
    <p class="small muted">Follows the ${esc(e.org)}. Check the official outline for your exam date. Add your own course books or notes to the Library and they'll be used and cited.</p>
  </div>`;
}

function studyAsk(text) { const i = $('#input'); if (!i) return; i.value = text; i.dispatchEvent(new Event('input')); $('#send')?.click(); }
document.addEventListener('click', (e) => {
  const pick = e.target.closest('[data-qz-pick]');
  if (pick) {
    const { qzPick: id, i, k } = pick.dataset;
    recordQuiz(id, Number(i), Number(k));
    const box = pick.closest('.quiz');
    if (box && quizCodes.get(id)) box.outerHTML = quizHTML(quizCodes.get(id));
    return;
  }
  const next = e.target.closest('[data-qz-next]');
  const chat = S.route.view === 'chat' && chatById(S.route.id);
  const a = chat && assistantById(chat.assistantId);
  if (next) { const w = a?.exam ? weakTopics(a.exam) : []; studyAsk(w.length ? `Give me 5 more practice questions on my weak spots: ${w.map((x) => `${x.section} ${x.topic}`).join('; ')}.` : 'Give me 5 more practice questions, a little harder.'); return; }
  const ex = e.target.closest('[data-qz-explain]');
  if (ex) {
    const qz = parseQuiz(quizCodes.get(ex.dataset.qzExplain) || '');
    const st = S.data.quiz?.[ex.dataset.qzExplain] || {};
    const missed = (qz?.questions || []).map((q, i) => ({ q, i })).filter(({ q, i }) => st[i] != null && Number(st[i]) !== Number(q.answer));
    studyAsk(missed.length ? `Explain the ones I got wrong in a different way, then test me on the same ideas: ${missed.map(({ q }) => `"${q.q.slice(0, 160)}"`).join('; ')}` : 'I got them all right. Teach me the next topic in this section.');
    return;
  }
  const sec = e.target.closest('[data-study]');
  if (sec && a?.exam) { const s = EXAMS[a.exam].sections[sec.dataset.study]; studyAsk(`Start ${a.exam} ${sec.dataset.study} (${s.name}): give me a short lesson on the most heavily tested topic in it, then practice questions.`); return; }
  if (e.target.closest('[data-study-weak]') && a?.exam) { const w = weakTopics(a.exam); studyAsk(`Re-teach my weakest topics briefly, then quiz me on them: ${w.map((x) => `${x.section} ${x.topic}`).join('; ')}.`); return; }
  if (e.target.closest('[data-study-plan]')) { studyAsk('Make me a study plan. Ask me what you need to know first.'); return; }
  if (e.target.closest('[data-study-sim]')) studyAsk('Give me a task-based simulation (TBS) for the section I am studying. Ask which section if you need to.');
});
