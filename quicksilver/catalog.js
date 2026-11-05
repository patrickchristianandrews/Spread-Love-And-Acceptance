// Quicksilver — model hub catalog and the Stack Advisor.
// Each model is a free, open model in GGUF format, downloaded straight from Hugging Face.
// `jobs` scores how good each model is at each job (0-10), used to rank recommendations.

const MODELS = [
  {
    id: 'llama-3.2-1b', name: 'Llama 3.2 1B Instruct', maker: 'Meta', params: '1B',
    uri: 'hf:bartowski/Llama-3.2-1B-Instruct-GGUF:Q4_K_M', sizeGB: 0.81,
    blurb: 'Tiny and very fast. Runs on almost any PC, but keeps things simple.',
    jobs: { chat: 4, coding: 2, roleplay: 3, writing: 3, study: 3, light: 9 },
  },
  {
    id: 'llama-3.2-3b', name: 'Llama 3.2 3B Instruct', maker: 'Meta', params: '3B',
    uri: 'hf:bartowski/Llama-3.2-3B-Instruct-GGUF:Q4_K_M', sizeGB: 2.02,
    blurb: 'Small, quick and friendly. A great first model for laptops.',
    jobs: { chat: 6, coding: 4, roleplay: 5, writing: 5, study: 5, light: 8 },
  },
  {
    id: 'qwen2.5-3b', name: 'Qwen 2.5 3B Instruct', maker: 'Alibaba', params: '3B',
    uri: 'hf:bartowski/Qwen2.5-3B-Instruct-GGUF:Q4_K_M', sizeGB: 1.93,
    blurb: 'Small model that punches above its weight at facts, maths and structure.',
    jobs: { chat: 6, coding: 5, roleplay: 4, writing: 5, study: 6, light: 8 },
  },
  {
    id: 'phi-3.5-mini', name: 'Phi 3.5 Mini Instruct', maker: 'Microsoft', params: '3.8B',
    uri: 'hf:bartowski/Phi-3.5-mini-instruct-GGUF:Q4_K_M', sizeGB: 2.39,
    blurb: 'Compact reasoner, strong at explaining and step-by-step answers.',
    jobs: { chat: 5, coding: 5, roleplay: 3, writing: 4, study: 7, light: 7 },
  },
  {
    id: 'qwen2.5-coder-7b', name: 'Qwen 2.5 Coder 7B Instruct', maker: 'Alibaba', params: '7B',
    uri: 'hf:bartowski/Qwen2.5-Coder-7B-Instruct-GGUF:Q4_K_M', sizeGB: 4.68,
    blurb: 'Built for programming: writing, fixing and explaining code in many languages.',
    jobs: { chat: 5, coding: 9, roleplay: 2, writing: 4, study: 6, light: 4 },
  },
  {
    id: 'qwen2.5-7b', name: 'Qwen 2.5 7B Instruct', maker: 'Alibaba', params: '7B',
    uri: 'hf:bartowski/Qwen2.5-7B-Instruct-GGUF:Q4_K_M', sizeGB: 4.68,
    blurb: 'Sharp all-rounder: knowledge, maths, code and long answers.',
    jobs: { chat: 8, coding: 7, roleplay: 6, writing: 7, study: 8, light: 4 },
  },
  {
    id: 'llama-3.1-8b', name: 'Llama 3.1 8B Instruct', maker: 'Meta', params: '8B',
    uri: 'hf:bartowski/Meta-Llama-3.1-8B-Instruct-GGUF:Q4_K_M', sizeGB: 4.92,
    blurb: 'Natural, warm conversation. A dependable everyday assistant.',
    jobs: { chat: 8, coding: 6, roleplay: 7, writing: 7, study: 7, light: 4 },
  },
  {
    id: 'gemma-2-9b', name: 'Gemma 2 9B Instruct', maker: 'Google', params: '9B',
    uri: 'hf:bartowski/gemma-2-9b-it-GGUF:Q4_K_M', sizeGB: 5.76,
    blurb: 'Polished, articulate writer with good judgment.',
    jobs: { chat: 8, coding: 6, roleplay: 7, writing: 8, study: 8, light: 3 },
  },
  {
    id: 'mistral-nemo-12b', name: 'Mistral Nemo 12B Instruct', maker: 'Mistral AI', params: '12B',
    uri: 'hf:bartowski/Mistral-Nemo-Instruct-2407-GGUF:Q4_K_M', sizeGB: 7.48,
    blurb: 'A favourite for stories and role-play: creative, vivid and stays in character.',
    jobs: { chat: 8, coding: 6, roleplay: 9, writing: 9, study: 7, light: 2 },
  },
  {
    id: 'qwen2.5-14b', name: 'Qwen 2.5 14B Instruct', maker: 'Alibaba', params: '14B',
    uri: 'hf:bartowski/Qwen2.5-14B-Instruct-GGUF:Q4_K_M', sizeGB: 8.99,
    blurb: 'The smartest model here. Needs a strong graphics card or lots of memory.',
    jobs: { chat: 9, coding: 8, roleplay: 7, writing: 8, study: 9, light: 1 },
  },
];

// The jobs the Stack Advisor knows, with the settings and assistant each one gets.
const JOBS = {
  chat: {
    label: 'Everyday assistant', icon: '💬',
    pitch: 'Questions, advice, ideas, emails and planning.',
    temperature: 0.7, contextSize: 8192, maxTokens: 2048,
    assistant: {
      name: 'Quicksilver Assistant',
      tagline: 'Your everyday helper for questions, ideas and plans.',
      personality: 'You are Quicksilver, a helpful, friendly and honest assistant running privately on the user\'s own computer. Give clear, direct answers. Use Markdown (headings, lists, code blocks) when it helps. If you are unsure, say so instead of guessing.',
    },
  },
  coding: {
    label: 'Coding', icon: '🧑‍💻',
    pitch: 'Writing, fixing and explaining code.',
    temperature: 0.2, contextSize: 16384, maxTokens: 4096,
    assistant: {
      name: 'Code Partner',
      tagline: 'Writes, reviews and explains code.',
      personality: 'You are an expert software engineer pairing with the user. Write correct, idiomatic, working code. Always put code in fenced code blocks with the language named. Explain briefly what you changed and why. Point out bugs, edge cases and security issues. Ask a short clarifying question when the request is ambiguous.',
    },
  },
  roleplay: {
    label: 'Role-play & characters', icon: '🎭',
    pitch: 'Chatting with characters and interactive stories.',
    temperature: 0.9, contextSize: 16384, maxTokens: 1024,
    assistant: null, // uses your characters instead
  },
  writing: {
    label: 'Creative writing', icon: '✍️',
    pitch: 'Stories, lyrics, poems, scripts and editing.',
    temperature: 0.9, contextSize: 8192, maxTokens: 4096,
    assistant: {
      name: 'Muse',
      tagline: 'A creative writing partner and editor.',
      personality: 'You are a skilled creative writing partner. Match the user\'s tone and genre, write with vivid concrete detail and varied rhythm, and avoid clichés. When editing, keep the author\'s voice and explain your main changes briefly.',
    },
  },
  study: {
    label: 'Study & research', icon: '📚',
    pitch: 'Explaining topics, summarising and homework help.',
    temperature: 0.4, contextSize: 16384, maxTokens: 3072,
    assistant: {
      name: 'Tutor',
      tagline: 'Explains anything step by step.',
      personality: 'You are a patient, accurate tutor. Explain ideas step by step, starting simple and adding depth. Use examples and analogies. Check understanding with a short question at the end when it helps. Be honest about the limits of what you know; you have no internet access.',
    },
  },
  light: {
    label: 'Fast on a modest PC', icon: '⚡',
    pitch: 'Quick replies on laptops and older computers.',
    temperature: 0.7, contextSize: 4096, maxTokens: 1024,
    assistant: {
      name: 'Quick Helper',
      tagline: 'Short, fast answers.',
      personality: 'You are a fast, concise assistant. Keep answers short and to the point unless asked for more.',
    },
  },
};

// Rough memory a model needs: the file, plus room for its working memory (grows with context).
function needGB(m, contextSize) {
  return m.sizeGB * 1.1 + 0.6 + (contextSize / 8192) * 0.5;
}

// Decides how well each model fits this PC and ranks them for a job.
function advise(job, hw, installedCatalogIds = []) {
  const j = JOBS[job];
  const usableRam = Math.max(0, hw.ramGB * 0.75 - 1.5); // leave room for Windows and other apps
  const vram = hw.gpu && hw.gpu !== 'none' ? hw.vramGB : 0;

  const rows = MODELS.map((m) => {
    const ctx = j.contextSize;
    const need = needGB(m, ctx);
    let fit, speed, mult;
    if (vram && need <= vram * 0.92) { fit = 'gpu'; speed = 'Fast: runs fully on your graphics card'; mult = 1; }
    else if (vram && need <= vram + usableRam) { fit = 'split'; speed = 'Good: split between graphics card and memory'; mult = 0.85; }
    else if (need <= usableRam) { fit = 'cpu'; speed = vram ? 'Slower: too big for your graphics card, runs on the processor' : 'Runs on your processor (no supported graphics card found)'; mult = 0.7; }
    else { fit = 'no'; speed = `Too big for this PC (needs about ${need.toFixed(1)} GB)`; mult = 0; }

    // On slow hardware, prefer smaller models a little more for responsiveness.
    if (fit === 'cpu' && m.sizeGB > 3) mult *= 0.8;
    const score = m.jobs[job] * mult;
    return { model: m, fit, speed, score, needGB: need, installed: installedCatalogIds.includes(m.id) };
  });

  const ranked = rows.filter((r) => r.fit !== 'no').sort((a, b) => b.score - a.score || a.model.sizeGB - b.model.sizeGB);
  // If the context would be tight, recommend a smaller window instead of failing to load.
  const contextSize = ranked[0] && ranked[0].fit === 'cpu' && hw.ramGB < 12 ? Math.min(j.contextSize, 8192) : j.contextSize;
  return {
    job, label: j.label,
    settings: { temperature: j.temperature, contextSize, maxTokens: j.maxTokens },
    picks: ranked.slice(0, 3),
    tooBig: rows.filter((r) => r.fit === 'no').map((r) => r.model.name),
  };
}

module.exports = { MODELS, JOBS, advise };
