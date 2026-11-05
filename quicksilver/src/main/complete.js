// Runs a request on any target and streams events back:
//   local:<modelId>              a model on this PC
//   api:<providerId>:<model>     a model from a connected API
//   stack:<stackId>              several models working together
// Events: {type:'text'|'reasoning', text} {type:'status', text} {type:'step', ...} {type:'stats', ...}
const store = require('./store');
const models = require('./models');
const llama = require('./llama');
const providers = require('./providers');
const toolbox = require('./tools');

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
function deleteStack(id) { store.writeJSON(STACKS(), stacks().filter((s) => s.id !== id)); }

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
  return 'No model';
}

function canSee(target) {
  const t = parse(target);
  if (t.kind === 'local') return Boolean(models.get(t.id)?.files?.mmproj);
  if (t.kind === 'api') return providers.get(t.providerId)?.vision !== false;
  return false;
}

function exists(target) {
  const t = parse(target);
  if (t.kind === 'local') return Boolean(models.get(t.id));
  if (t.kind === 'api') return Boolean(providers.get(t.providerId));
  if (t.kind === 'stack') return stacks().some((s) => s.id === t.id);
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
- Fill gaps the drafts missed, and cut repetition.
- Match the format the user needs (tables, lists, code blocks, length).
Write only the final answer, as if you wrote it yourself. Do not mention drafts, models or this process.`;

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

// Effort: quick = first drafter only; balanced = first drafter + lead review;
// thorough and max = every drafter + the lead combining them.
async function* stack(stackDef, req) {
  const { members } = stackDef;
  const level = req.level || 'thorough';
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
    const vision = (members.vision && exists(members.vision) && members.vision) || everyone.find(canSee);
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

  // 4. The lead combines (or reviews) and streams the final answer.
  const lead = judge || drafters[0];
  const base = msgsFor(lead);
  const sys = drafts.length > 1 ? LEAD : REVIEW;
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
  const s = { role: 'lead', label: drafts.length > 1 ? 'Combining the drafts' : 'Reviewing and improving', model: label(lead), text: '', done: false };
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

// Everything you can chat with, for menus and the API server.
function targets() {
  const out = [];
  for (const m of models.list().filter((x) => x.kind === 'text')) out.push({ target: `local:${m.id}`, label: m.name, name: m.name, group: 'On this PC', vision: Boolean(m.files.mmproj) });
  for (const s of stacks()) out.push({ target: `stack:${s.id}`, label: `${s.emoji || '⚡'} ${s.name}`, name: s.name, group: 'Stacks', stack: true });
  for (const p of providers.publicList()) for (const m of p.models || []) out.push({ target: `api:${p.id}:${m}`, label: m, name: m, group: p.name, vision: p.vision });
  return out;
}

// Loads a target's first local model ahead of time, so the first reply starts quickly.
async function warm(target, { contextSize, gpu } = {}) {
  let t = parse(target);
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

module.exports = { warm, run, targets, stacks, saveStack, deleteStack, label, exists, canSee, parse };
