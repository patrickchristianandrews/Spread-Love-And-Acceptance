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
const lastUserText = (messages) => {
  const m = [...messages].reverse().find((x) => x.role === 'user');
  return !m ? '' : typeof m.content === 'string' ? m.content : (m.content || []).filter((p) => p.type === 'text').map((p) => p.text).join('\n');
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
  if (add) {
    if (messages[0]?.role === 'system') messages[0] = { ...messages[0], content: `${messages[0].content}\n\n${add}` };
    else messages.unshift({ role: 'system', content: add });
  }
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

function exists(target) {
  const t = parse(target);
  if (t.kind === 'local') return Boolean(models.get(t.id));
  if (t.kind === 'api') return Boolean(providers.get(t.providerId));
  if (t.kind === 'stack') return stacks().some((s) => s.id === t.id);
  if (t.kind === 'kbm') { const km = kbModels().find((m) => m.id === t.id); return Boolean(km && exists(km.base)); }
  return false;
}

const hasImages = (messages) => messages.some((m) => Array.isArray(m.content) && m.content.some((p) => p.type === 'image_url'));

async function* single(target, req) {
  const t = parse(target);
  if (t.kind === 'local') {
    const m = models.get(t.id);
    if (!m) throw new Error('That model is no longer installed. Pick another one.');
    yield* llama.chat({ id: m.id, name: m.name, file: m.files.model, mmproj: m.files.mmproj }, req);
  } else if (t.kind === 'api') {
    yield* providers.chat(t.providerId, t.model, req);
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
  const hard = HARD.test(text) || text.length > 500 || /```|\d+\s*[-+*/^×÷]\s*\d+/.test(text);
  return hard ? 'thorough' : 'quick';
}

// Effort: quick = first drafter only; balanced = first drafter + lead review;
// thorough and max = every drafter + the lead combining them. "auto" stacks pick for themselves
// unless you ask for Quick (always one model) or Max (always the full stack).
async function* stack(stackDef, req) {
  const { members } = stackDef;
  let level = req.level || 'thorough';
  if (members.mode === 'auto' && level !== 'quick') {
    level = level === 'max' ? 'thorough' : autoLevel(req);
    if (level === 'thorough') yield { type: 'status', text: 'A harder one: thinking it through with two models…' };
  }
  let drafters = (members.drafters || []).filter(exists);
  let judge = members.judge && exists(members.judge) ? members.judge : null;
  if (level === 'quick') { drafters = drafters.slice(0, 1).length ? drafters.slice(0, 1) : [judge].filter(Boolean); judge = null; }
  else if (level === 'balanced') drafters = drafters.slice(0, 1);
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
    req = { ...req, describedMessages: textOnly(messages, descriptions) };
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

  // 2. One drafter and no lead: just stream it.
  if (!judge && drafters.length === 1) {
    yield* single(drafters[0], { ...req, messages: msgsFor(drafters[0]) });
    return;
  }

  // 3. Drafts. Local models take turns (they share this PC's memory); cloud models run at the
  //    same time, so a mixed stack costs little extra time.
  const draftSteps = drafters.map((d, i) => ({ role: 'draft', label: `Draft ${i + 1} of ${drafters.length}`, model: label(d), text: '', done: false }));
  for (const s of draftSteps) yield step(s);
  yield { type: 'status', text: `Drafting with ${drafters.length} models…` };
  const runDraft = async (d, i) => {
    const s = draftSteps[i];
    const started = Date.now();
    try {
      s.text = await collect(d, { ...req, messages: msgsFor(d) }, live(s));
    } catch (err) {
      if (req.signal?.aborted) throw err;
      s.error = String(err.message || err);
    }
    s.done = true; s.ms = Date.now() - started;
    req.onStep?.(s);
  };
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
        r.text = await collect(d, { ...req, messages: [...base, { role: 'assistant', content: own }, { role: 'user', content: `${CRITIQUE}\n\n${others}` }] }, live(r));
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

  // 4. The lead combines (or reviews) and streams the final answer.
  const lead = judge || drafters[0];
  const base = msgsFor(lead);
  const sys = drafts.length > 1 ? ({ debate: DEBATE_LEAD, consensus: CONSENSUS }[mode] || LEAD) : REVIEW;
  const draftText = drafts.map((d, i) => `<draft number="${i + 1}">\n${d.text}\n</draft>`).join('\n\n');
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
  for await (const ev of single(lead, { ...req, messages: leadMessages, temperature: Math.min(req.temperature ?? 0.5, 0.5) })) {
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

async function* run(target, req) {
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
// The best team this PC can field from every model you have (the ones that come with Quicksilver,
// ones you download, ones found in LM Studio, Ollama and so on): the strongest model leads and
// writes the answer, the next best from a different maker drafts alongside it on hard questions,
// and the best model that can see reads photos. Smart routing keeps simple messages quick.
// Rebuilt whenever your models change, unless you edit it yourself; never rebuilt if you delete it.
async function ensureQuicksilverStack() {
  const have = stacks().find((s) => s.id === 'quicksilver');
  if (store.config().quicksilverRemoved || (have && have.autoManaged === false)) return have ? 'stack:quicksilver' : null;
  const pool = models.list().filter((m) => m.kind === 'text').map(catalog.profileInstalled);
  if (pool.length < 2) return have ? 'stack:quicksilver' : null;
  const hw = await hardware.detect();
  // The lead answers every message, so it must be quick on this PC; bigger, slower models still
  // join as the second opinion on hard questions.
  const team = catalog.compose(pool, 'general', hw, store.config().calib?.text || 1, { vision: true, speed: 10, leadSpeed: 20, budget: 180 });
  if (!team || team.ids.length < 2) return have ? 'stack:quicksilver' : null;
  const local = (id) => (id ? `local:${id}` : undefined);
  const members = { drafters: team.members.drafters.map(local), judge: local(team.members.judge), vision: local(team.members.vision), mode: 'auto' };
  if (!members.vision) delete members.vision;
  if (!have || JSON.stringify(have.members) !== JSON.stringify(members)) saveStack({ id: 'quicksilver', name: 'Quicksilver', emoji: '💧', builtIn: true, autoManaged: true, builtFor: 'general', members });
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
      return { target: t, name: m.name, prof, est: catalog.estimateText(prof, hw, calib), vision: prof.vision, local: true };
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
    members: all.map((x) => ({ name: x.name, roles: roles(x), where: WHERE[x.est.fit] || x.est.fit, speed: x.est.label, rating: x.est.rating, wps: Math.round(wps(x)), vision: x.vision })),
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
  return out;
}

// Loads a target's first local model ahead of time, so the first reply starts quickly.
async function warm(target, { contextSize, gpu } = {}) {
  let t = parse(target);
  if (t.kind === 'kbm') { const km = kbModels().find((m) => m.id === t.id); if (!km) return false; return warm(km.base, { contextSize, gpu }); }
  if (t.kind === 'stack') {
    const st = stacks().find((x) => x.id === t.id);
    const first = [...(st?.members.drafters || []), st?.members.judge].find((x) => x && parse(x).kind === 'local' && exists(x));
    if (!first) return false;
    t = parse(first);
  }
  if (t.kind !== 'local') return false;
  const m = models.get(t.id);
  if (!m) return false;
  await llama.ensure({ id: m.id, name: m.name, file: m.files.model, mmproj: m.files.mmproj }, { contextSize, gpu });
  return true;
}

module.exports = { warm, run, targets, stacks, saveStack, deleteStack, kbModels, saveKbModel, deleteKbModel, label, exists, canSee, parse, autoLevel, ensureQuicksilverStack, explainStack };
