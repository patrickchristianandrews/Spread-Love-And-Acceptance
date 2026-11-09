// Runs a request on any target and streams events back:
//   local:<modelId>              a model on this PC
//   api:<providerId>:<model>     a model from a connected API
//   stack:<stackId>              several models working together
//   kbm:<id>                     a knowledge model: any of the above, answering from your knowledge bases
// Events: {type:'text'|'reasoning', text} {type:'status', text} {type:'step', ...} {type:'stats', ...}
const store = require('./store');
const models = require('./models');
const llama = require('./llama');
const providers = require('./providers');
const toolbox = require('./tools');
const knowledge = require('./knowledge');
const hardware = require('./hardware');
const catalog = require('../shared/catalog');

// ---------- stacks ----------
// { id, name, emoji, members: { vision?: target, drafters: [target], judge?: target }, builtFor? }

const STACKS = () => store.file('stacks.json');
function stacks() { return store.readJSON(STACKS(), []); }
function saveStack(s) {
  const all = stacks().filter((x) => x.id !== s.id);
  all.push(s);
  store.writeJSON(STACKS(), all);
  return s;
}
function deleteStack(id) {
  if (id === 'quicksilver') store.saveConfig({ quicksilverRemoved: true });
  store.writeJSON(STACKS(), stacks().filter((s) => s.id !== id));
}

// ---------- knowledge models ----------
// { id, name, emoji, base: target, knowledge: [collectionId] (empty = all), strict, instructions, k }
// A saved model that always searches your chosen knowledge bases first and cites them. It works
// anywhere a model does: chats, stacks, Infuse and the API server.

const KBM = () => store.file('knowledge-models.json');
function kbModels() { return store.readJSON(KBM(), []); }
function saveKbModel(m) {
  if (!m?.name || !m.base) throw new Error('Give it a name and a model to answer with.');
  if (parse(m.base).kind === 'kbm') throw new Error('Pick a normal model or stack as the base.');
  const all = kbModels().filter((x) => x.id !== m.id);
  all.push(m);
  store.writeJSON(KBM(), all);
  return m;
}
function deleteKbModel(id) { store.writeJSON(KBM(), kbModels().filter((m) => m.id !== id)); }

const STRICT = 'IMPORTANT: Answer ONLY from the reference material provided below. Do not use general knowledge or memory. Cite every factual statement with its source number. If the material does not contain the answer, say it was not found in the knowledge base, and what kind of source would answer it.';
// The person's own words in the latest message (without the app's <context> block, so a long
// list of sources doesn't make an easy question look hard).
const lastUserText = (messages) => {
  const m = [...messages].reverse().find((x) => x.role === 'user');
  const t = !m ? '' : typeof m.content === 'string' ? m.content : (m.content || []).filter((p) => p.type === 'text').map((p) => p.text).join('\n');
  return t.replace(/^<context>[\s\S]*?<\/context>\s*/, '');
};

async function* knowledgeModel(km, req) {
  const query = lastUserText(req.messages);
  yield { type: 'status', text: `Searching ${km.name}'s knowledge…` };
  let sources = [];
  if (query) {
    try { sources = [...(await knowledge.search(query, { k: km.k || 8, collectionIds: km.knowledge || [] }))]; } catch (err) { yield { type: 'status', text: `Knowledge search failed: ${err.message}` }; }
  }
  if (sources.length) yield { type: 'sources', sources: sources.map((s) => ({ title: s.title, url: s.url, path: s.path, text: (s.text || '').slice(0, 4000) })) };
  const parts = [];
  if (km.instructions) parts.push(km.instructions);
  if (km.strict) parts.push(STRICT);
  if (km.strict && !sources.length) parts.push('No reference material matched this question.');
  if (sources.length) {
    parts.push('Reference material for this answer follows. Use it when relevant and cite it inline with its number, like [1] or [2].' + (km.strict ? '' : ' If it does not answer the question, say so and answer from general knowledge, making clear which is which.'));
    sources.forEach((s, i) => parts.push(`<source number="${i + 1}" title="${s.title}"${s.url ? ` url="${s.url}"` : ''}>\n${(s.text || '').slice(0, 5000)}\n</source>`));
  }
  const messages = [...req.messages];
  const add = parts.join('\n\n');
  // Like the chat: what changes per question goes with the latest message, so the system prompt
  // (and the conversation the model has already read) stays the same.
  const li = messages.map((x) => x.role).lastIndexOf('user');
  if (add && li >= 0) {
    const put = (t) => (t.startsWith('<context>\n') ? `<context>\n${add}\n\n${t.slice(10)}` : `<context>\n${add}\n</context>\n\n${t}`);
    const c = messages[li].content;
    const k = Array.isArray(c) ? c.findIndex((x) => x.type === 'text') : -1;
    messages[li] = { ...messages[li], content: typeof c === 'string' ? put(c) : k >= 0 ? c.map((x, j) => (j === k ? { ...x, text: put(x.text) } : x)) : [{ type: 'text', text: put('') }, ...c] };
  } else if (add) messages.unshift({ role: 'system', content: add });
  yield { type: 'status', text: '' };
  const next = { ...req, messages };
  if (parse(km.base).kind === 'stack' || next.toolList) yield* run(km.base, next); else yield* single(km.base, next);
}

// ---------- targets ----------

function parse(target) {
  const [kind, ...rest] = String(target || '').split(':');
  if (kind === 'api') { const [providerId, ...m] = rest; return { kind, providerId, model: m.join(':') }; }
  return { kind, id: rest.join(':') };
}

function label(target) {
  const t = parse(target);
  if (t.kind === 'free') return '♻️ Free cloud AIs (rotating)';
  if (t.kind === 'local') return models.get(t.id)?.name || 'Missing model';
  if (t.kind === 'api') return `${t.model} (${providers.get(t.providerId)?.name || 'API'})`;
  if (t.kind === 'stack') return stacks().find((s) => s.id === t.id)?.name || 'Missing stack';
  if (t.kind === 'kbm') return kbModels().find((m) => m.id === t.id)?.name || 'Missing knowledge model';
  return 'No model';
}

function canSee(target) {
  const t = parse(target);
  if (t.kind === 'local') return Boolean(models.get(t.id)?.files?.mmproj);
  if (t.kind === 'api') return providers.get(t.providerId)?.vision !== false;
  if (t.kind === 'kbm') { const km = kbModels().find((m) => m.id === t.id); return km ? canSee(km.base) : false; }
  return false;
}

// ---------- free rotation ----------
// Free cloud plans have limits. When a free one runs out (rate limit or daily quota), the next free
// cloud AI you've connected answers instead, so you keep going for free. "♻️ Free cloud AIs" in the
// model menu rotates through them from the start.
const LIMIT = /\b429\b|rate.?limit|quota|limit (reached|exceeded)|too many requests|exceeded your|resource.?exhausted|credits? (are )?(exhausted|depleted)|insufficient (balance|credit)/i;
const isLimit = (err) => err?.status === 429 || LIMIT.test(String(err?.message || err));
let freeTurn = 0;
function freeTargets(exclude) {
  if (store.config().offline) return [];
  const out = [];
  for (const p of providers.publicList()) {
    const pre = providers.PRESETS[p.preset];
    if (!pre || !['free', 'some'].includes(pre.free) || !(p.hasKey || p.noKey) || !(p.models || []).length) continue;
    // On "free to start" services, prefer models marked free (like OpenRouter's ":free" ones).
    const freeModels = (p.models || []).filter((m) => /:free$|-free\b|flash/i.test(m));
    const model = pre.free === 'some' ? (freeModels[0] || (p.models.includes(pre.best) ? pre.best : p.models[0])) : (p.models.includes(pre.best) ? pre.best : p.models[0]);
    const tg = `api:${p.id}:${model}`;
    if (tg !== exclude && !String(exclude || '').startsWith(`api:${p.id}:`)) out.push(tg);
  }
  return out;
}
async function* rotateFrom(list, req, firstErr) {
  let lastErr = firstErr;
  for (const tg of list) {
    const t = parse(tg);
    yield { type: 'status', text: `♻️ Free limit reached; switching to ${label(tg)}…` };
    let produced = false;
    try {
      for await (const ev of providers.chat(t.providerId, t.model, req)) { if (ev.type === 'text') produced = true; yield ev; }
      return true;
    } catch (err) {
      if (produced || !isLimit(err)) throw err;
      lastErr = err;
    }
  }
  if (lastErr) throw new Error(`Every free cloud AI you've connected has hit its limit for now (${String(lastErr.message || lastErr).slice(0, 120)}). Try again later, connect another free one under Models → Connect an API, or use the models on this PC.`);
  return false;
}
async function* withFreeRotation(target, req) {
  const t = parse(target);
  let produced = false;
  try {
    for await (const ev of providers.chat(t.providerId, t.model, req)) { if (ev.type === 'text') produced = true; yield ev; }
  } catch (err) {
    const p = providers.get(t.providerId);
    const free = ['free', 'some'].includes(providers.PRESETS[p?.preset]?.free);
    if (produced || !free || req.noRotate || !isLimit(err)) throw err;
    const list = freeTargets(target);
    if (!list.length) throw err;
    yield* rotateFrom(list, req, err);
  }
}
async function* freeRotation(req) {
  const list = freeTargets();
  if (!list.length) throw new Error('Connect a free cloud AI first (Models → Connect an API → Free).');
  const start = freeTurn++ % list.length;
  yield* rotateFrom([...list.slice(start), ...list.slice(0, start)], req, null);
}

function exists(target) {
  const t = parse(target);
  if (t.kind === 'free') return freeTargets().length > 0;
  if (t.kind === 'local') return Boolean(models.get(t.id));
  if (t.kind === 'api') return Boolean(providers.get(t.providerId));
  if (t.kind === 'stack') return stacks().some((s) => s.id === t.id);
  if (t.kind === 'kbm') { const km = kbModels().find((m) => m.id === t.id); return Boolean(km && exists(km.base)); }
  return false;
}

const hasImages = (messages) => messages.some((m) => Array.isArray(m.content) && m.content.some((p) => p.type === 'image_url'));

// How a local model is started: with its small same-family helper when one is installed
// (speculative decoding). Warm-up, reading ahead and answers must agree, or the answer would
// reuse a server started without the helper.
function localSpec(m, messages = []) {
  const d = !m.files.mmproj && !hasImages(messages) ? catalog.draftFor(m.catalogId, models.list()) : null;
  return { id: m.id, name: m.name, file: m.files.model, mmproj: m.files.mmproj, draft: d?.files.model };
}

// Step-by-step reasoning for the Quicksilver model on questions that need care. Its fast model
// has no built-in "thinking" mode, so it's asked to work it out first inside <think> tags; that
// part shows under "Thought it through" and the answer follows. Easy questions skip it.
// Two short passes, so the steps always show whatever the model's habits: first it writes only its
// working (shown under "Thought it through"), then the answer from that working. The second pass
// re-reads only the new lines, so together they take about as long as one thinking pass.
const STEPS_PLAN = 'Work out the user\'s latest message step by step, briefly: at most 6 short numbered steps (about 80 words in all): what is asked, the working, and a check of the result. Recompute every number yourself. Write only the numbered steps, not the final answer.';
const STEPS_ANSWER = (steps) => `Your working for the user's latest message (the user can see it under "Thought it through"):\n${steps}\nNow write the final answer for the user: clear and complete, consistent with the working (if a step was wrong, fix it). Don't repeat all the steps.`;
// Real questions get the steps (anything with a number, a 'why / how / explain' kind of question,
// or any question of some length); greetings, thanks and one-line chat don't, so they stay instant.
// Instant effort (you chose speed) skips them.
function stepWorthy(req) {
  const t = lastUserText(req.messages).replace(/<context>[\s\S]*?<\/context>/g, '').replace(/\[Image \d+:[\s\S]*?\]/g, '').replace(/<file name=[\s\S]*?<\/file>/g, '').trim();
  if (t.length < 12 || /^(hi|hey|hello|thanks|thank you|ok|okay|cool|great|nice|yes|no|bye)\b[\s!.,]*$/i.test(t)) return false;
  // Only where thinking first actually helps (maths, 'why / how / compare / plan' questions, long
  // problems), so everyday questions stay as quick as before.
  return HARD.test(t) || /\d\s*[-+*/^×÷%]\s*\d|\d+\s*(%|percent)/.test(t) || t.length > 300;
}
function wantsSteps(m, req) {
  if (req.level === 'quick' || req.points || req.stepByStep === false || req.tools?.length || req.toolList || hasImages(req.messages)) return false;
  if (!(req.stepByStep || m.source === 'bundled')) return false;
  const c = catalog.TEXT_MODELS.find((x) => x.id === m.catalogId);
  if (c?.reasoning) return false; // models that think on their own already do this
  return stepWorthy(req);
}

async function* single(target, req) {
  const t = parse(target);
  if (t.kind === 'local') {
    const m = models.get(t.id);
    if (!m) throw new Error('That model is no longer installed. Pick another one.');
    // Thinking takes time: models that can switch it off skip it for easy questions (Deep think
    // always thinks). Hard questions still get the full think.
    const level = req.level === 'max' || req.points ? req.level : (req.level === 'quick' || autoLevel(req) === 'quick' ? 'quick' : req.level);
    if (wantsSteps(m, req)) {
      const msgs = req.messages;
      const withSys = (content) => [...msgs.slice(0, -1), { role: 'system', content }, msgs[msgs.length - 1]];
      yield { type: 'status', text: 'Thinking it through step by step…' };
      let steps = '';
      const planMsgs = withSys(STEPS_PLAN);
      for await (const ev of llama.chat(localSpec(m, planMsgs), { ...req, messages: planMsgs, level: 'thorough', maxTokens: 320, temperature: 0.2 })) {
        if (ev.type === 'text' || ev.type === 'reasoning') { steps += ev.text; yield { type: 'reasoning', text: ev.text }; }
        else if (ev.type === 'status') yield ev;
      }
      steps = steps.replace(/<\/?think>/g, '').trim();
      const answerMsgs = steps ? withSys(STEPS_ANSWER(steps.slice(0, 2500))) : msgs;
      yield* llama.chat(localSpec(m, answerMsgs), { ...req, messages: answerMsgs, level: 'thorough' });
      return;
    }
    yield* llama.chat(localSpec(m, req.messages), { ...req, level: req.points ? 'quick' : level });
  } else if (t.kind === 'api') {
    yield* withFreeRotation(target, req);
  } else if (t.kind === 'free') {
    yield* freeRotation(req);
  } else if (t.kind === 'kbm') {
    const km = kbModels().find((m) => m.id === t.id);
    if (!km) throw new Error('That knowledge model was deleted. Pick another one.');
    yield* knowledgeModel(km, req);
  } else if (t.kind === 'stack') {
    yield* run(target, req);
  } else {
    throw new Error('Choose a model first.');
  }
}

// Collects a whole answer (used for drafts and image descriptions).
async function collect(target, req, onPartial) {
  let text = '';
  let last = 0;
  for await (const ev of single(target, req)) {
    if (ev.type === 'text') {
      text += ev.text;
      if (onPartial && Date.now() - last > 350) { last = Date.now(); onPartial(text); }
    }
  }
  onPartial?.(text);
  return text.trim();
}

// ---------- the stack runner ----------

const DESCRIBE = 'Describe each image below in detail for a colleague who cannot see it. Transcribe all visible text exactly, give table contents and chart values, and note people, objects, layout and anything unusual. Video frames are labelled with their timestamps; describe what changes over time. Answer with one section per image, headed "### Image 1", "### Image 2" and so on.';

const LEAD = `You are the lead of a team of AI models. Several models have independently drafted answers to the user's latest message. Your job is to produce the single best final answer:
- Keep everything that is correct, useful and well-argued from any draft.
- Check facts, numbers, logic and code carefully; fix mistakes and resolve contradictions using your own judgment.
- Recompute every calculation yourself, step by step, rather than trusting a draft's figures (drafts that disagree on a number usually mean one is wrong).
- Fill gaps the drafts missed, and cut repetition.
- Match the format the user needs (tables, lists, code blocks, length).
Write only the final answer, as if you wrote it yourself. Do not mention drafts, models or this process.`;

const CONSENSUS = `You are the lead of a panel of AI models that answered the user's latest message independently. Build the final answer on consensus:
- State plainly what most of the drafts agree on, and treat that as the most reliable part.
- Where the drafts disagree, check the point yourself and decide; if it can't be settled, say so.
- End with a short "Where the models disagreed" section (or "The models agreed on all key points").
Write the final answer only; do not number or quote the drafts.`;

const DEBATE_LEAD = `You are the judge of a debate between AI models. Each model answered the user's latest message, then read the others' answers, criticised them and revised its own. Using the revised answers and critiques, write the single best final answer: adopt the arguments that survived criticism, correct anything shown to be wrong, and resolve remaining disagreements with your own careful judgment. Write only the final answer, as if you wrote it yourself.`;

const CRITIQUE = `Other AI models answered the same question as you. Read their answers below, then:
1. In a section "Critique", list concrete errors, gaps or weak reasoning in the other answers (and in your own), briefly.
2. In a section "Revised answer", write your improved answer, keeping what was right and fixing what was wrong.`;

// ---------- power moves ----------
//  vote     Majority vote: the lead answers three times independently; if they agree that's
//           the answer, otherwise it settles the differences. Big gains on maths and logic.
//  redteam  Red team: one model answers, another hunts for every mistake, the first fixes them.
//  plan     Plan, then solve: a planner breaks the task into steps; the lead follows them.
//  panel    Expert panel: a practical expert, a sceptic and a creative each give their view;
//           the lead weighs them into one balanced answer.
const POWER_MOVES = ['vote', 'redteam', 'plan', 'panel'];
const RED_TEAM = 'You are a ruthless reviewer. Find every real problem in the answer above: factual errors, wrong numbers or maths, broken logic or code, missing cases, risky advice, unclear parts. List each problem with a short fix. If there are no real problems, reply exactly: NO ISSUES.';
const PLANNER = 'Do not answer yet. Write a short, numbered plan for the best possible answer to my message: the steps to work through, what to check, and the format the answer should take. At most 8 steps.';
const PANEL = [
  ['A practical expert', 'Answer as a seasoned practical expert in this subject: what actually works, concrete steps and numbers.'],
  ['A careful sceptic', 'Answer as a careful sceptic: the risks, hidden costs, common mistakes and what could go wrong, plus how to avoid them.'],
  ['A creative thinker', 'Answer as a creative thinker: unusual options, smarter angles and alternatives most people miss.'],
];
function askOnLast(messages, extra) {
  const out = [...messages];
  const last = out[out.length - 1];
  if (!last || last.role !== 'user') return out;
  out[out.length - 1] = typeof last.content === 'string' ? { ...last, content: `${last.content}\n\n(${extra})` } : { ...last, content: [...last.content, { type: 'text', text: `\n\n(${extra})` }] };
  return out;
}
function leadOver(base, sys, notes) {
  const last = base[base.length - 1];
  const lastText = typeof last.content === 'string' ? last.content : last.content.filter((p) => p.type === 'text').map((p) => p.text).join('\n');
  return [
    { role: 'system', content: `${sys}${base[0]?.role === 'system' ? `\n\nThe user's assistant instructions, which still apply:\n${typeof base[0].content === 'string' ? base[0].content : ''}` : ''}` },
    ...base.slice(base[0]?.role === 'system' ? 1 : 0, -1),
    { role: 'user', content: Array.isArray(last.content) ? [...last.content.filter((p) => p.type === 'image_url'), { type: 'text', text: `${lastText}\n\n---\n${notes}\n---\nWrite the final answer to my message above.` }] : `${lastText}\n\n---\n${notes}\n---\nWrite the final answer to my message above.` },
  ];
}
async function* powerMove(kind, lead, helpers, req, msgsFor, step, live) {
  const run = async (s, target, r) => { const t0 = Date.now(); try { s.text = await collect(target, r, live(s)); } catch (err) { if (req.signal?.aborted) throw err; s.error = String(err.message || err); } s.done = true; s.ms = Date.now() - t0; req.onStep?.(s); return s.text || ''; };
  const helper = helpers[0] || lead;
  const finish = async function* (sys, notes, labelText) {
    const s = { role: 'lead', label: labelText, model: label(lead), text: '', done: false };
    yield step(s);
    const t0 = Date.now();
    yield* single(lead, { ...req, messages: leadOver(msgsFor(lead), sys, notes) });
    s.done = true; s.ms = Date.now() - t0;
    yield { type: 'step', step: s };
  };
  if (kind === 'vote') {
    const tries = [0.2, 0.7, 1.0].map((temp, i) => ({ s: { role: 'draft', label: `Attempt ${i + 1} of 3`, model: label(lead), text: '', done: false }, temp }));
    for (const x of tries) yield step(x.s);
    yield { type: 'status', text: 'Answering three times independently, then taking the majority…' };
    for (const x of tries) await run(x.s, lead, { ...req, messages: msgsFor(lead), temperature: x.temp, maxTokens: Math.min(req.maxTokens || 2048, 1500) });
    for (const x of tries) yield { type: 'step', step: x.s };
    const texts = tries.map((x) => x.s.text).filter(Boolean);
    if (!texts.length) throw new Error('Every attempt failed.');
    // Two or more attempts agree: that's the answer.
    for (let i = 0; i < texts.length; i++) for (let j = i + 1; j < texts.length; j++) {
      if (draftsAgree([texts[i], texts[j]])) {
        const s = { role: 'lead', label: 'Majority agreed', model: label(lead), text: '', done: true, ms: 0 };
        yield step(s);
        for (const part of (texts[i].length >= texts[j].length ? texts[i] : texts[j]).match(/[\s\S]{1,80}/g) || []) yield { type: 'text', text: part };
        return;
      }
    }
    yield* finish(`${LEAD}\nThese drafts are independent attempts by the same model. Where they disagree on a result, work it out carefully yourself and give the correct one.`, texts.map((t, i) => `<attempt number="${i + 1}">\n${t.slice(0, 6000)}\n</attempt>`).join('\n\n'), 'Settling the differences');
    return;
  }
  if (kind === 'redteam') {
    const a = { role: 'draft', label: 'First answer', model: label(lead), text: '', done: false };
    const c = { role: 'critique', label: 'Red team: hunting for mistakes', model: label(helper), text: '', done: false };
    yield step(a); yield step(c);
    yield { type: 'status', text: 'Answering, then a second model hunts for mistakes…' };
    const answer = await run(a, lead, { ...req, messages: msgsFor(lead), maxTokens: Math.min(req.maxTokens || 2048, 2000) });
    yield { type: 'step', step: a };
    if (!answer) throw new Error(a.error || 'No answer to check.');
    const issues = await run(c, helper, { ...req, points: true, messages: [...msgsFor(helper), { role: 'assistant', content: answer }, { role: 'user', content: RED_TEAM }], maxTokens: 500, temperature: 0.2 });
    yield { type: 'step', step: c };
    if (!issues || /^\W*no issues\W*$/i.test(issues.trim())) {
      const s = { role: 'lead', label: 'No mistakes found', model: label(lead), text: '', done: true, ms: 0 };
      yield step(s);
      for (const part of answer.match(/[\s\S]{1,80}/g) || []) yield { type: 'text', text: part };
      return;
    }
    yield* finish('You wrote the first answer below; a reviewer then listed problems with it. Write the corrected final answer: fix every real problem, ignore any criticism that is wrong, and keep what was good. Write only the final answer; do not mention the review.', `<first_answer>\n${answer.slice(0, 8000)}\n</first_answer>\n\n<review>\n${issues.slice(0, 3000)}\n</review>`, 'Fixing what the red team found');
    return;
  }
  if (kind === 'plan') {
    const p = { role: 'draft', label: 'Planning the answer', model: label(helper), text: '', done: false };
    yield step(p);
    yield { type: 'status', text: 'Planning first, then solving step by step…' };
    const plan = await run(p, helper, { ...req, points: true, messages: askOnLast(msgsFor(helper), PLANNER), maxTokens: 350, temperature: 0.3 });
    yield { type: 'step', step: p };
    yield* finish('A planner wrote the plan below for answering the user\'s latest message. Follow it step by step to write the best, complete final answer (improve the plan if a step is wrong). Write only the final answer; do not mention the plan.', `<plan>\n${plan.slice(0, 3000)}\n</plan>`, 'Solving it step by step');
    return;
  }
  if (kind === 'panel') {
    const who = [lead, ...helpers];
    const views = PANEL.map(([name], i) => ({ s: { role: 'draft', label: name, model: label(who[i % who.length]), text: '', done: false }, target: who[i % who.length], ask: PANEL[i][1] }));
    for (const v of views) yield step(v.s);
    yield { type: 'status', text: 'Asking an expert, a sceptic and a creative thinker…' };
    for (const v of views) await run(v.s, v.target, { ...req, points: true, messages: askOnLast(msgsFor(v.target), `${v.ask} Be concise: at most 150 words.`), maxTokens: 300 });
    for (const v of views) yield { type: 'step', step: v.s };
    yield* finish('A panel gave three perspectives on the user\'s latest message: a practical expert, a careful sceptic and a creative thinker. Write one balanced, decisive final answer that uses the best of each: the practical steps, the important risks, and any smart alternative worth knowing. Write only the final answer; do not mention the panel.', views.filter((v) => v.s.text).map((v) => `<view from="${v.s.label}">\n${v.s.text.slice(0, 2500)}\n</view>`).join('\n\n'), 'Weighing the panel');
  }
}

// Key points first: what helpers are asked for, and how the lead uses them.
const POINTS_ASK = 'Do not write the full answer. List only the key points a complete, correct answer must include: the facts, numbers, steps, options and pitfalls, plus anything easy to get wrong. Terse bullet points, at most 120 words.';
const POINTS_LEAD = `You are the lead of a team of AI models. Helper models have listed key points for the user's latest message. Write the best complete answer yourself: use the points that are correct and useful, ignore any that are wrong, and add anything important they missed. Check numbers and logic yourself. Write only the final answer, as if you wrote it alone; do not mention the notes, helpers or this process.`;
function withPointsAsk(messages) {
  const out = [...messages];
  const last = out[out.length - 1];
  if (!last || last.role !== 'user') return out;
  out[out.length - 1] = typeof last.content === 'string'
    ? { ...last, content: `${last.content}\n\n(${POINTS_ASK})` }
    : { ...last, content: [...last.content, { type: 'text', text: `\n\n(${POINTS_ASK})` }] };
  return out;
}
const REVIEW = `You are a careful senior reviewer. Another model has drafted an answer to the user's latest message. Produce the final answer: keep what is good, fix any errors in facts, numbers, logic or code, fill important gaps, and improve clarity and structure. Write only the final answer, as if you wrote it yourself. Do not mention the draft or this process.`;

function textOnly(messages, descriptions) {
  let k = 0;
  return messages.map((m) => {
    if (!Array.isArray(m.content)) return m;
    const parts = m.content.map((p) => {
      if (p.type !== 'image_url') return p.text || '';
      k++;
      return `[Image ${k}: ${descriptions[k - 1] || 'no description available'}]`;
    });
    return { role: m.role, content: parts.join('\n') };
  });
}

// Smart routing for stacks in "auto" mode (like the built-in Quicksilver model): simple messages
// and photos get one direct answer from the lead (photos are read by the vision member first);
// hard ones (maths, code, analysis, long inputs) get every drafter plus the lead combining them.
const HARD = /\b(why|how does|how do|prove|calculate|compute|solve|compare|analy[sz]e|evaluate|step[- ]by[- ]step|debug|code|function|script|error|bug|plan|strategy|pros and cons|trade-?offs?|explain|summari[sz]e|review|translate)\b/i;
function autoLevel(req) {
  if (hasImages(req.messages)) return 'quick';
  const text = lastUserText(req.messages);
  const hard = HARD.test(text) || text.length > 500 || /```|<file name=|\d+\s*[-+*/^×÷]\s*\d+/.test(text);
  return hard ? 'thorough' : 'quick';
}

// Effort: quick = first drafter only; balanced = first drafter + lead review;
// thorough and max = every drafter + the lead combining them. "auto" stacks pick for themselves
// unless you ask for Quick (always one model) or Max (always the full stack).
// Do two or more answers say essentially the same thing? Same final number (for maths), or
// mostly the same words.
function draftsAgree(texts) {
  if (texts.length < 2) return false;
  const lastNum = (t) => (t.replace(/,/g, '').match(/-?\d+(?:\.\d+)?/g) || []).pop();
  const words = (t) => new Set(t.toLowerCase().match(/[a-z0-9']{3,}/g) || []);
  const nums = texts.map(lastNum);
  if (nums.every(Boolean) && nums.every((n) => n === nums[0]) && texts.every((t) => t.length < 1500)) return true;
  const sets = texts.map(words);
  for (let i = 1; i < sets.length; i++) {
    const a = sets[0], b = sets[i];
    const inter = [...a].filter((w) => b.has(w)).length;
    if (!a.size || !b.size || inter / Math.min(a.size, b.size) < 0.82 || Math.max(a.size, b.size) / Math.min(a.size, b.size) > 1.5) return false;
  }
  return true;
}

// Quicksilver's signature move for creative work (stories, lyrics, names, ideas, jokes...): its
// quick second model, the Muse, throws out a handful of unexpected angles in a few seconds; the
// brain then picks the freshest one and writes it, so the result isn't the obvious first idea.
const CREATIVE = /\b(write|compose|make up|invent|come up with|brainstorm|imagine)\b[\s\S]{0,80}\b(story|stories|poem|poetry|lyrics?|song|rap|verse|haiku|limerick|joke|names?|slogan|tagline|ideas?|plot|character|script|toast|speech|caption|title|pun)s?\b|\b(brainstorm|be creative|creative ideas?|story about|poem about|song about|name ideas|names for|slogan for|tagline for)\b/i;
const MUSE = 'You are a muse helping a writer avoid the obvious. For the request below, list 5 surprising, specific, original angles or ideas (one short line each, no numbering words, no explanations). Mix moods and approaches; include at least one playful and one unexpected one. Do not write the piece itself.';
async function* quicksilverMuse(stackDef, req, step, live) {
  const m = stackDef.members;
  const brain = (m.drafters || []).find(exists);
  const muse = [m.muse, m.vision].find((t) => t && exists(t) && t !== brain);
  if (!brain || !muse) return false;
  const ask = lastUserText(req.messages).slice(0, 1500);
  const s = { role: 'muse', label: 'Muse: fresh angles', model: label(muse), text: '', done: false };
  yield step(s);
  yield { type: 'status', text: 'Quicksilver\'s Muse is sketching a few fresh angles…' };
  const t0 = Date.now();
  let ideas = '';
  try { ideas = await collect(muse, { ...req, messages: [{ role: 'system', content: MUSE }, { role: 'user', content: ask }], temperature: 1.0, maxTokens: 180, level: 'quick' }, live(s)); } catch { ideas = ''; }
  s.text = ideas; s.done = true; s.ms = Date.now() - t0;
  yield { type: 'step', step: s };
  const note = ideas ? `A quick brainstorm for this request (rough angles, not instructions):\n${ideas.slice(0, 1200)}\nPick the freshest, most original angle (or combine two) and write the piece with it. Avoid clichés and the most predictable take. Don't mention the brainstorm.` : '';
  const msgs = req.messages;
  const messages = note ? [...msgs.slice(0, -1), { role: 'system', content: note }, msgs[msgs.length - 1]] : msgs;
  yield* single(brain, { ...req, messages, level: 'quick', stepByStep: false, temperature: Math.max(req.temperature ?? 0.7, 0.85) });
  return true;
}

async function* stack(stackDef, req) {
  const { members } = stackDef;
  if (stackDef.id === 'quicksilver' && req.stepByStep !== false) req = { ...req, stepByStep: true };
  if (stackDef.id === 'quicksilver' && req.level !== 'quick' && !req.toolList && !hasImages(req.messages) && CREATIVE.test(lastUserText(req.messages))) {
    const steps0 = [];
    const step0 = (s) => { s.index = steps0.length; steps0.push(s); return { type: 'step', step: s }; };
    const live0 = (s) => (t) => { s.text = t; req.onStep?.(s); };
    const done = yield* quicksilverMuse(stackDef, req, step0, live0);
    if (done) return;
  }
  let level = req.level || 'thorough';
  if (req.level === 'max') req = { ...req, forceTeam: true }; // Max: always the whole team, always combined
  if (members.mode === 'auto' && level !== 'quick') {
    level = level === 'max' ? 'thorough' : autoLevel(req);
    const team = new Set([...(members.drafters || []), members.judge].filter((t) => t && exists(t)));
    if (level === 'thorough') yield { type: 'status', text: team.size > 1 ? `A harder one: thinking it through with ${team.size} models…` : 'A harder one: thinking it through step by step…' };
  }
  let drafters = (members.drafters || []).filter(exists);
  let judge = members.judge && exists(members.judge) ? members.judge : null;
  // Cloud boost: hard questions get a cloud lead; everything else stays on this PC.
  if (members.cloudHard && exists(members.cloudHard) && level !== 'quick' && autoLevel(req) === 'thorough' && !require('./offline').isOffline()) {
    judge = members.cloudHard;
    yield { type: 'status', text: 'A hard one: your models draft, the cloud lead finishes it…' };
  }
  // Easy questions don't need the whole team: the strongest member on this PC answers on its
  // own (Max effort always uses everyone). Saves loading and running the other models.
  const localLead = [judge, ...drafters].find((t) => t && parse(t).kind !== 'api');
  if (level === 'thorough' && !req.forceTeam && members.mode !== 'auto' && members.mode !== 'debate' && !POWER_MOVES.includes(members.mode) && !hasImages(req.messages) && !req.toolList && autoLevel(req) === 'quick' && localLead) {
    drafters = [localLead]; judge = null; level = 'quick';
    yield { type: 'status', text: `A quick one: ${label(localLead)} answers on its own…` };
  }
  if (level === 'quick') { drafters = drafters.slice(0, 1).length ? drafters.slice(0, 1) : [judge].filter(Boolean); judge = null; }
  else if (level === 'balanced') drafters = drafters.slice(0, 1);
  // Order: a model that's already in memory goes first, and the lead (if it also drafts) goes
  // last, so it's still loaded when it writes the final answer instead of loading twice.
  if (drafters.length > 1) {
    const loaded = (t) => { const p = parse(t); const mm = p.kind === 'local' && models.get(p.id); return mm ? llama.isLoaded(mm.files.model) : false; };
    drafters = [...drafters].sort((a, b) => (a === judge) - (b === judge) || loaded(b) - loaded(a));
  }
  if (!drafters.length && !judge) throw new Error(`The stack "${stackDef.name}" has no installed models. Open Stacks to finish setting it up.`);
  let messages = req.messages;
  const steps = [];
  const step = (s) => { s.index = steps.length; steps.push(s); return { type: 'step', step: s }; };
  const live = (s) => (t) => { s.text = t; req.onStep?.(s); };

  // 1. Vision: if there are images and not every member can see, a vision model describes them.
  const everyone = [...drafters, judge].filter(Boolean);
  if (hasImages(messages) && !everyone.every(canSee)) {
    // Look across the whole stack, not just the members this route uses: a quick route may have
    // left out the member that can see (e.g. the Quicksilver model's 2B, which reads photos).
    const vision = (members.vision && exists(members.vision) && members.vision) || everyone.find(canSee)
      || [...(members.drafters || []), members.judge].filter((t) => t && exists(t)).find(canSee);
    if (!vision) throw new Error('This chat has images, but no model in the stack can see. Add a vision model to the stack.');
    const imgs = messages.flatMap((m) => (Array.isArray(m.content) ? m.content.filter((p) => p.type === 'image_url') : []));
    const s = { role: 'vision', label: 'Looking at the images', model: label(vision), text: '', done: false };
    yield step(s);
    yield { type: 'status', text: `Looking at the images with ${label(vision)}…` };
    const started = Date.now();
    const desc = await collect(vision, {
      ...req,
      messages: [{ role: 'user', content: [{ type: 'text', text: DESCRIBE }, ...imgs] }],
      temperature: 0.2,
      maxTokens: Math.min(4096, 600 * imgs.length + 400),
    }, live(s));
    s.text = desc; s.done = true; s.ms = Date.now() - started;
    yield { type: 'step', step: s };
    const parts = desc.split(/^###\s*Image\s*\d+\s*$/im).map((x) => x.trim()).filter(Boolean);
    const descriptions = parts.length >= imgs.length ? parts : imgs.map(() => desc);
    // Members that can see keep the real images; the rest get the descriptions.
    req = { ...req, describedMessages: textOnly(messages, descriptions), stepByStep: false };
  }
  // Tools: the lead gathers information (and takes approved actions) first; every member then
  // works from what it found.
  if (req.toolList) {
    const gatherer = judge || drafters[0];
    const s = { role: 'tools', label: 'Using tools', model: label(gatherer), text: '', done: false };
    yield step(s);
    const found = [];
    let note = '';
    for await (const ev of agent(gatherer, { ...req, messages: req.describedMessages || messages })) {
      if (ev.type === 'tool') { yield ev; if (ev.call.status !== 'running') found.push(`<tool name="${ev.call.name}" status="${ev.call.status}">\n${ev.call.result}\n</tool>`); }
      else if (ev.type === 'text') note += ev.text;
      else if (ev.type === 'status') yield ev;
    }
    s.text = note.trim(); s.done = true;
    yield { type: 'step', step: s };
    if (found.length) {
      const add = { role: 'system', content: `Results from tools used for this request (actions listed here have already been carried out; do not repeat them):\n${found.join('\n')}` };
      messages = [...messages.slice(0, -1), add, messages[messages.length - 1]];
      if (req.describedMessages) req = { ...req, describedMessages: [...req.describedMessages.slice(0, -1), add, req.describedMessages[req.describedMessages.length - 1]] };
    }
  }
  const msgsFor = (target) => (canSee(target) || !req.describedMessages ? messages : req.describedMessages);
  // A team's inner steps (drafts, critiques, combining) skip the separate reasoning pass: the
  // drafts are the working. Only an answer written straight to you reasons step by step.
  const inner = { ...req, stepByStep: false };

  // Power moves: little-known ways of working together that beat a bigger model.
  if (POWER_MOVES.includes(members.mode) && level !== 'quick') {
    const lead = judge || drafters[0];
    const helpers = [...new Set([...(members.drafters || []).filter(exists), judge].filter((x) => x && x !== lead))];
    yield* powerMove(members.mode, lead, helpers, inner, msgsFor, step, live);
    return;
  }

  // 2. One model answers (no lead, or the lead is the only drafter): just stream it. Drafting and
  //    then reviewing its own draft would cost a second pass for nothing.
  if ((!judge && drafters.length === 1) || (judge && drafters.length === 1 && drafters[0] === judge && members.mode !== 'debate')) {
    yield* single(drafters[0], { ...req, messages: msgsFor(drafters[0]) });
    return;
  }
  if (judge && !drafters.length) { yield* single(judge, { ...req, messages: msgsFor(judge) }); return; }

  // 3. Drafts. Local models take turns (they share this PC's memory); cloud models run at the
  //    same time, so a mixed stack costs little extra time.
  //    Key points first (Auto effort, blend teams): the helpers write short key points instead
  //    of full answers, and the lead writes one full answer from them. Most of a team's gain
  //    comes from comparing ideas, so this keeps the accuracy at a fraction of the time.
  //    Deep think (Max) still has every model write a full answer.
  const mode0 = stackDef.members.mode || 'blend';
  const points = judge && !req.forceTeam && ['blend', 'consensus', 'auto'].includes(mode0) && level === 'thorough' && drafters.some((d) => d !== judge);
  if (points) {
    drafters = drafters.filter((d) => d !== judge);
    // Only helpers close to the lead in quality are worth the wait: a much weaker model's key
    // points mostly add noise, and on a PC without a graphics card each one costs real time.
    const q = (t) => { const p = parse(t); if (p.kind !== 'local') return 8; const m = models.get(p.id); return m ? catalog.scoreFor(catalog.profileInstalled(m), 'general') : 0; };
    const lead = q(judge);
    drafters = drafters.filter((d) => q(d) >= lead - 1.5);
    if (!drafters.length) { yield* single(judge, { ...req, messages: msgsFor(judge) }); return; }
  }
  const draftSteps = drafters.map((d, i) => ({ role: 'draft', label: points ? `Key points ${i + 1} of ${drafters.length}` : `Draft ${i + 1} of ${drafters.length}`, model: label(d), text: '', done: false }));
  for (const s of draftSteps) yield step(s);
  yield { type: 'status', text: `Drafting with ${drafters.length} models…` };
  const runDraft = async (d, i) => {
    const s = draftSteps[i];
    const started = Date.now();
    try {
      s.text = points
        ? await collect(d, { ...inner, points: true, messages: withPointsAsk(msgsFor(d)), maxTokens: 320, temperature: Math.min(req.temperature ?? 0.6, 0.5) }, live(s))
        : await collect(d, { ...inner, messages: msgsFor(d), maxTokens: Math.min(req.maxTokens || 2048, 1800) }, live(s));
    } catch (err) {
      if (req.signal?.aborted) throw err;
      s.error = String(err.message || err);
    }
    s.done = true; s.ms = Date.now() - started;
    req.onStep?.(s);
  };
  const team = [...drafters.slice(1), judge].filter((x, i, arr) => x && parse(x).kind === 'local' && arr.indexOf(x) === i);
  llama.prefetch(team.map((x) => { const mm = models.get(parse(x).id); return mm && { id: mm.id, name: mm.name, file: mm.files.model, mmproj: mm.files.mmproj, size: mm.size }; }).filter(Boolean), { contextSize: req.contextSize, gpu: req.gpu }).catch(() => {});
  const localChain = (async () => { for (let i = 0; i < drafters.length; i++) if (parse(drafters[i]).kind !== 'api') await runDraft(drafters[i], i); })();
  const cloud = drafters.map((d, i) => (parse(d).kind === 'api' ? runDraft(d, i) : null)).filter(Boolean);
  await Promise.all([localChain, ...cloud]);
  const drafts = [];
  draftSteps.forEach((s) => { if (s.text) drafts.push({ model: s.model, text: s.text }); });
  for (const s of draftSteps) yield { type: 'step', step: s };
  if (req.signal?.aborted) return;
  if (!drafts.length && !judge) throw new Error('Every model in the stack failed. ' + (steps.find((s) => s.error)?.error || ''));

  // 3b. Debate: every model reads the others' answers, critiques them and revises its own.
  const mode = stackDef.members.mode || 'blend';
  if (mode === 'debate' && drafts.length >= 2 && level !== 'quick' && level !== 'balanced') {
    const revSteps = drafters.map((d, i) => ({ role: 'critique', label: `Debate: ${label(d)} critiques and revises`, model: label(d), text: '', done: false }));
    for (const r of revSteps) yield step(r);
    yield { type: 'status', text: 'The models are debating each other\'s answers…' };
    const runRev = async (d, i) => {
      const r = revSteps[i];
      const own = draftSteps[i].text;
      if (!own) { r.done = true; r.error = 'No first answer to revise.'; return; }
      const others = drafts.filter((x) => x.text !== own).map((x, k) => `<answer from="model ${k + 1}">\n${x.text}\n</answer>`).join('\n\n');
      const base = msgsFor(d);
      const started = Date.now();
      try {
        r.text = await collect(d, { ...inner, messages: [...base, { role: 'assistant', content: own }, { role: 'user', content: `${CRITIQUE}\n\n${others}` }] }, live(r));
      } catch (err) { if (req.signal?.aborted) throw err; r.error = String(err.message || err); }
      r.done = true; r.ms = Date.now() - started;
      req.onStep?.(r);
    };
    const chain = (async () => { for (let i = 0; i < drafters.length; i++) if (parse(drafters[i]).kind !== 'api') await runRev(drafters[i], i); })();
    await Promise.all([chain, ...drafters.map((d, i) => (parse(d).kind === 'api' ? runRev(d, i) : null)).filter(Boolean)]);
    for (const r of revSteps) yield { type: 'step', step: r };
    revSteps.forEach((r, i) => { if (r.text) drafts.push({ model: `${r.model} (after debate)`, text: r.text }); });
    if (req.signal?.aborted) return;
  }

  // 3c. Agreement: when the drafts already say the same thing, combining them adds little, so
  //     the lead's own draft (or the fullest one) is the answer. Debate always gets judged.
  if (drafts.length >= 2 && mode !== 'debate' && !req.forceTeam && !points) {
    const agreed = draftsAgree(drafts.map((d) => d.text));
    if (agreed) {
      const own = draftSteps.find((s, i) => drafters[i] === judge && s.text)?.text;
      const pick = own || drafts.map((d) => d.text).sort((a, b) => b.length - a.length)[0];
      const s = { role: 'lead', label: 'The models agreed: no need to combine', model: label(judge || drafters[0]), text: '', done: true, ms: 0 };
      yield step(s);
      for (const part of pick.match(/[\s\S]{1,80}/g) || []) yield { type: 'text', text: part };
      return;
    }
  }

  // 4. The lead combines (or reviews) and streams the final answer.
  const lead = judge || drafters[0];
  const base = msgsFor(lead);
  const sys = points ? POINTS_LEAD : drafts.length > 1 ? ({ debate: DEBATE_LEAD, consensus: CONSENSUS }[mode] || LEAD) : REVIEW;
  // Very long drafts are trimmed for the lead: it needs their substance, not every word, and a
  // shorter read is faster and lighter on memory.
  const draftText = points ? drafts.map((d, i) => `<notes from="helper ${i + 1}">\n${d.text.slice(0, 3000)}\n</notes>`).join('\n\n') : drafts.map((d, i) => `<draft number="${i + 1}">\n${d.text.length > 7000 ? `${d.text.slice(0, 7000)}\n[…the rest of this draft is shortened]` : d.text}\n</draft>`).join('\n\n');
  const last = base[base.length - 1];
  const lastText = typeof last.content === 'string' ? last.content : last.content.filter((p) => p.type === 'text').map((p) => p.text).join('\n');
  const leadMessages = [
    { role: 'system', content: `${sys}${base[0]?.role === 'system' ? `\n\nThe user's assistant instructions, which still apply:\n${typeof base[0].content === 'string' ? base[0].content : ''}` : ''}` },
    ...base.slice(base[0]?.role === 'system' ? 1 : 0, -1),
    {
      role: 'user',
      content: drafts.length
        ? (Array.isArray(last.content) ? [...last.content.filter((p) => p.type === 'image_url'), { type: 'text', text: `${lastText}\n\n---\n${draftText}\n---\nWrite the final answer to my message above.` }] : `${lastText}\n\n---\n${draftText}\n---\nWrite the final answer to my message above.`)
        : last.content,
    },
  ];
  const s = { role: 'lead', label: drafts.length > 1 ? ({ debate: 'Judging the debate', consensus: 'Building the consensus' }[mode] || 'Combining the drafts') : 'Reviewing and improving', model: label(lead), text: '', done: false };
  yield step(s);
  yield { type: 'status', text: `${s.label} with ${label(lead)}…` };
  const started = Date.now();
  for await (const ev of single(lead, { ...inner, messages: leadMessages, temperature: Math.min(req.temperature ?? 0.5, 0.5) })) {
    yield ev;
  }
  s.done = true; s.ms = Date.now() - started;
  yield { type: 'step', step: s };
}

// ---------- tools (integrations and MCP) ----------
// The model may call tools; we run them (asking first for anything that changes something),
// feed the results back, and repeat until it answers. Up to 8 rounds.

async function* agent(target, req) {
  const list = req.toolList;
  const defs = toolbox.schema(list);
  let messages = [...req.messages];
  for (let round = 0; round < 8; round++) {
    let text = '';
    let calls = null;
    for await (const ev of single(target, { ...req, messages, tools: defs })) {
      if (ev.type === 'tool_calls') { calls = ev.calls; continue; }
      if (ev.type === 'text') text += ev.text;
      yield ev;
    }
    if (!calls?.length || req.signal?.aborted) return;
    messages = [...messages, { role: 'assistant', content: text || null, tool_calls: calls.map((c) => ({ id: c.id, type: 'function', function: { name: c.name, arguments: c.arguments } })) }];
    for (const c of calls) {
      const tool = list.find((t) => t.name === c.name);
      let args = {};
      let result;
      try { args = JSON.parse(c.arguments || '{}'); } catch { result = { status: 'error', result: 'The tool arguments were not valid JSON. Try again with valid JSON.' }; }
      const step = { id: c.id, name: c.name, source: tool?.source || 'Tool', args, status: 'running' };
      yield { type: 'tool', call: { ...step } };
      result ||= await toolbox.execute(tool, args, { approve: req.approve });
      yield { type: 'tool', call: { ...step, status: result.status, result: result.result.slice(0, 3000) } };
      messages.push({ role: 'tool', tool_call_id: c.id, content: result.result });
    }
    if (text) yield { type: 'text', text: '\n\n' };
  }
  yield* single(target, { ...req, messages: [...messages, { role: 'user', content: 'Please give your final answer now, without using more tools.' }] });
}

// ---------- the 3-AI Council ----------
// Three models look at the same question, each in its own role, then one writes a single answer
// from all three and says how much they agreed. Local models take turns (they share this PC's
// memory); a cloud AI joins only if you've opted in to cloud help for hard questions.
const COUNCIL_ROLES = [
  { key: 'structurer', icon: '🏛️', label: 'Structurer', prompt: 'You are the Lead Structurer on a council of three AIs. Lay out the clearest, most complete answer to the user\'s latest message: the key facts, the steps or structure, and any code, table or numbers needed. Be concise: key points only, at most about 200 words.' },
  { key: 'critic', icon: '🔍', label: 'Critic', prompt: 'You are the Critic on a council of three AIs. Think carefully about the user\'s latest message and find what could go wrong: wrong assumptions, edge cases, mistakes in maths or facts, risks, and what a quick answer would miss. Recompute any numbers yourself. Key points only, at most about 200 words.' },
  { key: 'pragmatist', icon: '⚡', label: 'Pragmatist', prompt: 'You are the Pragmatist on a council of three AIs. Say what the user should actually do: the most practical, immediately usable answer, simplest first, with any shortcut or caveat that matters in real life. Key points only, at most about 150 words.' },
];
const COUNCIL_LEAD = 'You chair a council of three AIs who each looked at the user\'s latest message: a Structurer, a Critic and a Pragmatist. Their notes are below. Write the single best final answer for the user: keep what is correct and useful from each, fix anything the Critic showed to be wrong, and make it practical. Where they genuinely disagree, say so briefly and give your judgement. Do not mention the council or the notes. Your reply MUST start with one line exactly like "AGREEMENT: 85%" (how much the three agreed on the substance, 0-100), then the answer on the next line.';

// The Liquid Edition is completely uncensored: only uncensored models ever answer, check or sit on
// its Council. Uncensored = comes with Quicksilver, listed as uncensored in the catalog, or an
// uncensored model by name; in the cloud, an uncensored service (Venice) or model.
const UNCENSORED = /abliterat|uncensor|unfiltered|dolphin|hermes|lexi|rocinante/i;
const UNCENSORED_CLOUD = ['venice'];
function isUncensored(target) {
  if (!target) return false;
  if (target === 'stack:quicksilver') return true;
  const p = parse(target);
  if (p.kind === 'local') {
    const m = models.get(p.id);
    if (!m) return false;
    const c = catalog.TEXT_MODELS.find((x) => x.id === m.catalogId);
    return m.source === 'bundled' || c?.category === 'open' || UNCENSORED.test(`${m.name} ${m.files?.model || ''}`);
  }
  if (p.kind === 'api') {
    const [, pid, ...rest] = target.split(':');
    return UNCENSORED_CLOUD.includes(providers.get(pid)?.preset) || UNCENSORED.test(rest.join(':'));
  }
  return false;
}

function councilMembers(target, req) {
  const liquid = target === 'stack:quicksilver';
  const textTargets = targets().filter((t) => t.target.startsWith('local:') && exists(t.target) && !t.mediaOnly && (!liquid || isUncensored(t.target)));
  const score = (t, job = 'general') => { const m = models.get(parse(t).id); return m ? catalog.scoreFor(catalog.profileInstalled(m), job) : 0; };
  const fits = (t) => { const m = models.get(parse(t).id); return m && m.kind === 'text'; };
  const local = textTargets.map((t) => t.target).filter(fits);
  // The chat's own model (or its team's lead) structures; a thinker critiques; a quick one keeps it practical.
  const own = parse(target).kind === 'stack' ? (stacks().find((x) => `stack:${x.id}` === target)?.members?.drafters || []).find((t) => exists(t) && fits(t)) : (exists(target) && fits(target) ? target : null);
  const byGeneral = [...local].sort((a, b) => score(b) - score(a));
  const structurer = own || byGeneral[0];
  const thinkers = local.filter((t) => { const m = models.get(parse(t).id); const c = catalog.TEXT_MODELS.find((x) => x.id === m?.catalogId); return c?.reasoning; });
  const critic = [...thinkers, ...byGeneral].find((t) => t !== structurer) || structurer;
  let pragmatist = [...byGeneral].reverse().find((t) => t !== structurer && t !== critic) || byGeneral.find((t) => t !== structurer) || structurer;
  const cloud = store.config().offline ? null : targets().find((t) => t.target.startsWith('api:') && exists(t.target) && (!liquid || isUncensored(t.target)))?.target;
  if (req.councilCloud && cloud) pragmatist = cloud;
  return { structurer, critic, pragmatist, lead: structurer && score(critic) > score(structurer) + 1 ? critic : structurer };
}

async function* council(target, req) {
  const m = councilMembers(target, req);
  if (!m.structurer) throw new Error('The Council needs at least one model on this PC.');
  const steps = [];
  const step = (s) => { s.index = steps.length; steps.push(s); return { type: 'step', step: s }; };
  const notes = [];
  yield { type: 'status', text: '⚔️ The Council is meeting: three views on your question…' };
  for (const role of COUNCIL_ROLES) {
    const who = m[role.key];
    const s = { role: 'council', label: `${role.icon} ${role.label}`, model: label(who), text: '', done: false };
    yield step(s);
    const t0 = Date.now();
    const msgs = req.messages;
    const messages = [...msgs.slice(0, -1), { role: 'system', content: role.prompt }, msgs[msgs.length - 1]];
    try {
      s.text = await collect(who, { ...req, stepByStep: false, messages, level: role.key === 'critic' ? req.level : 'quick', maxTokens: 450, temperature: role.key === 'pragmatist' ? 0.6 : 0.4 }, (t) => { s.text = t; req.onStep?.(s); });
    } catch (err) { s.error = String(err?.message || err); }
    s.done = true; s.ms = Date.now() - t0;
    yield { type: 'step', step: s };
    if (s.text) notes.push(`<note role="${role.label}">\n${s.text.slice(0, 2500)}\n</note>`);
  }
  if (!notes.length) throw new Error('The Council couldn\'t meet: none of its models answered.');
  const s = { role: 'lead', label: '🏛️ Council verdict', model: label(m.lead), text: '', done: false };
  yield step(s);
  const t0 = Date.now();
  const msgs = req.messages;
  const messages = [...msgs.slice(0, -1), { role: 'system', content: `${COUNCIL_LEAD}\n\n${notes.join('\n')}` }, msgs[msgs.length - 1]];
  // The first line carries the agreement score; it's shown as a badge, not in the answer.
  let head = ''; let headDone = false;
  for await (const ev of single(m.lead, { ...req, stepByStep: false, messages, level: 'quick' })) {
    if (ev.type !== 'text' || headDone) { yield ev; continue; }
    head += ev.text;
    const nl = head.indexOf('\n');
    if (nl < 0 && head.length < 40) continue;
    headDone = true;
    const first = nl < 0 ? head : head.slice(0, nl);
    const mm = first.match(/AGREEMENT:\s*\**\s*(\d{1,3})\s*%/i);
    if (mm) {
      yield { type: 'council', agreement: Math.min(100, Number(mm[1])), members: COUNCIL_ROLES.map((r) => ({ role: r.label, icon: r.icon, model: label(m[r.key]) })) };
      const rest = nl < 0 ? '' : head.slice(nl + 1).replace(/^\s+/, '');
      if (rest) yield { type: 'text', text: rest };
    } else yield { type: 'text', text: head };
  }
  if (!headDone && head) yield { type: 'text', text: head.replace(/^\s*AGREEMENT:[^\n]*\n?/i, '') };
  s.done = true; s.ms = Date.now() - t0;
  yield { type: 'step', step: s };
}

async function* run(target, req) {
  if (req.council && !hasImages(req.messages)) { yield* council(target, req); return; }
  if (req.useTools) {
    const list = await toolbox.available();
    if (list.length) req = { ...req, toolList: list };
  }
  const t = parse(target);
  if (t.kind === 'stack') {
    const s = stacks().find((x) => x.id === t.id);
    if (!s) throw new Error('That stack was deleted. Pick another model.');
    yield* stack(s, req);
  } else if (req.toolList) {
    yield* agent(target, req);
  } else {
    yield* single(target, req);
  }
}

// ---------- the built-in Quicksilver model ----------
// Quicksilver's own custom stack, uncensored, built around the models that come with it:
//  - the built-in Qwen3 4B Instruct 2507 (uncensored) answers every everyday message, fast, and
//    works hard questions out step by step;
//  - the built-in Qwen3-VL 2B is its eyes: it reads photos and screenshots;
//  - when this PC has a clearly stronger model that still runs fast (one you downloaded, or one
//    found in LM Studio, Ollama and so on) that is also uncensored, it joins: it leads on hard questions, with the Qwen
//    brain's key points, so hard answers get better without slowing down everyday ones.
// Without the built-in brain (e.g. still downloading), the best fast team from your models is used.
// Rebuilt whenever your models change, unless you edit it yourself; never rebuilt if you delete it.
// A helper on hard questions must run smoothly here (10+ words a second) with room for the Brain
// beside it: on a graphics card, or with 16 GB of memory.
function smoothHelper(p, hw, calib = 1) {
  if (!p) return false;
  const e = catalog.estimateText(p, hw, calib);
  return ['great', 'good'].includes(e.rating) && (e.fit === 'gpu' || (hw.ramGB || 0) >= 15);
}

async function ensureQuicksilverStack() {
  const have = stacks().find((s) => s.id === 'quicksilver');
  if (store.config().quicksilverRemoved || (have && have.autoManaged === false)) return have ? 'stack:quicksilver' : null;
  const all = models.list().filter((m) => m.kind === 'text');
  const pool = all.map(catalog.profileInstalled);
  // The Liquid Edition's core follows the online picks: when a newer, better uncensored Brain or
  // Eyes is named there and you have it, it takes over; until then, the built-in ones.
  const core = require('./catalog-remote').picks().liquid || {};
  const brain = all.find((m) => core.brain && m.catalogId === core.brain && m.source !== 'bundled') || all.find((m) => m.id === 'starter-brain') || all.find((m) => m.catalogId === 'qwen3-4b');
  const eyes = all.find((m) => core.eyes && m.catalogId === core.eyes && m.source !== 'bundled') || all.find((m) => m.id === 'starter') || all.find((m) => /^qwen3-vl-/.test(m.catalogId || ''));
  // Quicksilver is uncensored, so only uncensored models are on its team: the ones that come with
  // it, and uncensored ones you add.
  const isOpen = (p) => isUncensored(`local:${p.id}`);
  const hw = await hardware.detect();
  const calib = store.config().calib?.text || 1;
  const local = (id) => (id ? `local:${id}` : undefined);
  let members;
  let bench;
  if (brain) {
    const score = (id) => { const p = pool.find((x) => x.id === id); return p ? catalog.scoreFor(p, 'general') : 0; };
    const openPool = pool.filter((p) => p.id !== brain.id && p.id !== eyes?.id && isOpen(p));
    const team = (openPool.length && catalog.compose(openPool, 'general', hw, calib, { vision: false, speed: 10, leadSpeed: 20, budget: 180 })) || { members: { drafters: [] } };
    const lead = team.members.judge || team.members.drafters[0];
    const stronger = lead && score(lead) > score(brain.id) ? lead : null;
    // A second opinion on hard questions: the best other uncensored model that isn't the lead.
    // It joins only where it runs smoothly, so hard answers don't get much slower; on a slower PC
    // it waits on the bench (it still sits on the Council, and you can chat with it directly).
    const candidate = [...team.members.drafters, team.members.judge].find((id) => id && id !== stronger);
    const second = candidate && smoothHelper(pool.find((p) => p.id === candidate), hw, calib) ? candidate : null;
    bench = candidate && !second ? local(candidate) : undefined;
    members = {
      drafters: [brain.id, ...(stronger ? [] : second ? [second] : [])].map(local),
      // With nobody to combine, the brain answers on its own (step by step on hard questions).
      judge: stronger || second ? local(stronger || brain.id) : undefined,
      vision: local(eyes?.id),
      mode: 'auto',
    };
  } else {
    // The built-in brain isn't here yet (still downloading): the best fast uncensored team for now.
    const openPool = pool.filter(isOpen);
    if (openPool.length < 2) return have?.builtFor === 'quicksilver' ? 'stack:quicksilver' : null;
    const team = catalog.compose(openPool, 'general', hw, calib, { vision: true, speed: 10, leadSpeed: 20, budget: 180 });
    if (!team || team.ids.length < 2) return have?.builtFor === 'quicksilver' ? 'stack:quicksilver' : null;
    members = { drafters: team.members.drafters.map(local), judge: local(team.members.judge), vision: local(team.members.vision), mode: 'auto' };
  }
  if (!members.vision) delete members.vision;
  if (!members.judge) delete members.judge;
  const def = { id: 'quicksilver', name: 'Quicksilver Liquid Edition', emoji: '💧', builtIn: true, autoManaged: true, custom: true, builtFor: 'quicksilver', ...(bench ? { bench } : {}),
    description: "Quicksilver Liquid Edition, Quicksilver's own uncensored crew: the built-in Qwen3 4B (the Brain) answers everyday messages fast and reasons step by step, Qwen3-VL 2B (Eyes & Muse) reads photos and sketches fresh angles for creative work, and a stronger fast uncensored model on this PC (the Closer) leads on hard questions.", members };
  if (!have || JSON.stringify(have.members) !== JSON.stringify(members) || have.builtFor !== 'quicksilver' || have.name !== def.name || (have.bench || null) !== (def.bench || null)) saveStack(def);
  return 'stack:quicksilver';
}

// How a stack runs on this PC, in plain words: who does what, where it runs, how long answers
// take, what it can do. Used by Home and the Compare page.
const WHERE = { gpu: 'graphics card', split: 'graphics card + memory', cpu: 'processor', cloud: 'cloud' };
async function explainStack(id) {
  const st = stacks().find((s) => s.id === id);
  if (!st) return null;
  const hw = await hardware.detect();
  const calib = store.config().calib?.text || 1;
  const info = (t) => {
    if (!t || !exists(t)) return null;
    const p = parse(t);
    if (p.kind === 'local') {
      const m = models.get(p.id);
      const prof = catalog.profileInstalled(m);
      const est = catalog.estimateText(prof, hw, calib);
      const real = require('./speeds').measured()[m.id];
      if (real) Object.assign(est, { tps: real.tps, wordsPerSec: real.tps * 0.75, measured: true });
      return { target: t, name: m.name, prof, est, vision: prof.vision, local: true };
    }
    return { target: t, name: label(t), prof: { id: t, jobs: { general: 8, coding: 8, research: 8 }, judge: 8, vision: canSee(t) }, est: { fit: 'cloud', rating: 'great', label: 'Fast', wordsPerSec: 40 }, vision: canSee(t), local: false };
  };
  const { members } = st;
  const lead = info(members.judge || members.drafters?.[0]);
  const drafters = (members.drafters || []).map(info).filter(Boolean);
  const eyes = info(members.vision) || drafters.find((d) => d.vision) || (lead?.vision ? lead : null);
  if (!lead) return null;
  const all = [lead, ...drafters, eyes].filter(Boolean).filter((x, i, arr) => arr.findIndex((y) => y.target === x.target) === i);
  const wps = (x) => Math.max(0.1, x.est.wordsPerSec || 0.1);
  const auto = members.mode === 'auto';
  // Same answer lengths as everywhere else in the app: a chat reply ~300 words, a hard answer ~500.
  const full = drafters.reduce((t, d) => t + 500 / wps(d), 0) + (members.judge ? 550 / wps(lead) : 0);
  const simple = auto ? 300 / wps(lead) : full;
  const photo = (eyes && eyes.target !== lead.target && !lead.vision ? 250 / wps(eyes) : 0) + (auto ? 300 / wps(lead) : full);
  const same = (a, b) => Boolean(a && b && a.target === b.target);
  const roles = (x) => [same(x, lead) && 'lead', !same(x, lead) && drafters.some((d) => same(d, x)) && 'draft', same(x, eyes) && !same(x, lead) && 'vision'].filter(Boolean);
  const quality = Math.max(...all.map((x) => catalog.scoreFor(x.prof, 'general')));
  return {
    id: st.id, name: st.name, emoji: st.emoji || '🧩', auto,
    members: all.map((x) => ({ name: x.name, roles: roles(x), where: WHERE[x.est.fit] || x.est.fit, speed: x.est.label, rating: x.est.rating, wps: Math.round(wps(x)), vision: x.vision, measured: Boolean(x.est.measured) })),
    lead: lead.name, second: drafters.find((d) => !same(d, lead))?.name || null, eyes: eyes && !same(eyes, lead) ? eyes.name : (lead.vision ? lead.name : null),
    times: { simple, hard: full, photo: eyes ? photo : null },
    stars: catalog.starsFor(quality, all.length >= 2),
    caps: catalog.capabilities(all.map((x) => x.prof), { local: all.every((x) => x.local) }),
  };
}

// Everything you can chat with, for menus and the API server.
function targets() {
  const out = [];
  for (const m of models.list().filter((x) => x.kind === 'text')) out.push({ target: `local:${m.id}`, label: m.name, name: m.name, group: 'On this PC', vision: Boolean(m.files.mmproj) });
  for (const s of stacks()) out.push({ target: `stack:${s.id}`, label: `${s.emoji || '⚡'} ${s.name}`, name: s.name, group: 'Infused AIs & stacks', stack: true });
  for (const k of kbModels()) if (exists(k.base)) out.push({ target: `kbm:${k.id}`, label: `${k.emoji || '📚'} ${k.name}`, name: k.name, group: 'Knowledge models', vision: canSee(k.base), knowledge: true });
  const off = Boolean(store.config().offline);
  for (const p of providers.publicList()) {
    if (off && !require('./offline').isLocal(p.baseUrl || 'https://cloud')) continue; // cloud AIs can't answer offline
    for (const m of p.models || []) out.push({ target: `api:${p.id}:${m}`, label: m, name: m, group: p.name, vision: p.vision });
  }
  if (freeTargets().length >= 2) out.push({ target: 'free:rotate', label: '♻️ Free cloud AIs (rotating)', name: 'Free cloud AIs (rotating)', group: 'Cloud', vision: false });
  return out;
}

// Loads a target's first local model ahead of time, so the first reply starts quickly.
// The local model that answers first for a target (a team's lead).
function firstLocal(target) {
  let t = parse(target);
  if (t.kind === 'kbm') { const km = kbModels().find((m) => m.id === t.id); return km ? firstLocal(km.base) : null; }
  if (t.kind === 'stack') {
    const st = stacks().find((x) => x.id === t.id);
    const first = [st?.members.judge, ...(st?.members.drafters || [])].find((x) => x && parse(x).kind === 'local' && exists(x));
    if (!first) return null;
    t = parse(first);
  }
  return t.kind === 'local' ? models.get(t.id) || null : null;
}
// Reading ahead: the model reads the conversation so far while you type (see checks.js).
async function prefill(target, messages, { contextSize, gpu } = {}) {
  if (parse(target).kind === 'kbm') return false;
  const m = firstLocal(target);
  if (!m) return false;
  return llama.prefill(localSpec(m, messages), messages, { contextSize, gpu });
}

async function warm(target, { contextSize, gpu } = {}) {
  let t = parse(target);
  if (t.kind === 'kbm') { const km = kbModels().find((m) => m.id === t.id); if (!km) return false; return warm(km.base, { contextSize, gpu }); }
  if (t.kind === 'stack') {
    const st = stacks().find((x) => x.id === t.id);
    const first = [st?.members.judge, ...(st?.members.drafters || [])].find((x) => x && parse(x).kind === 'local' && exists(x));
    if (!first) return false;
    t = parse(first);
  }
  if (t.kind !== 'local') return false;
  const m = models.get(t.id);
  if (!m) return false;
  await llama.ensure(localSpec(m), { contextSize: Math.min(contextSize || 8192, 8192), gpu });
  return true;
}

module.exports = { smoothHelper, isUncensored, councilMembers, warm, prefill, run, targets, stacks, saveStack, deleteStack, kbModels, saveKbModel, deleteKbModel, label, exists, canSee, parse, autoLevel, ensureQuicksilverStack, explainStack };
