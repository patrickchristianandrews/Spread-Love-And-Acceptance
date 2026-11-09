// Quicksilver — the model catalog, the jobs, the Stack Advisor and the speed estimates.
//
// Every model is free and open, downloaded from Hugging Face. Files are found by pattern
// (repo + file match), so a renamed file in a repo doesn't break the download.
// Sizes are approximate download sizes in GB. `activeGB` is set for mixture-of-experts
// models, which only read part of their weights per word and so run much faster than
// their size suggests.

// ---------- text models ----------
// jobs: how good the model is at each job (0-10). judge: how good it is at combining
// several drafts into one final answer (the "lead" of a stack).

const TEXT_MODELS = [
  // Small and fast
  { id: 'qwen3-1.7b', name: 'Qwen3 1.7B', maker: 'Alibaba', params: '1.7B', category: 'small', repo: 'unsloth/Qwen3-1.7B-GGUF', quant: 'Q4_K_M', sizeGB: 1.1, ctx: 32768, reasoning: true,
    blurb: 'Tiny but thinks before it answers. Runs on almost anything.', jobs: { general: 4, office: 3, research: 3, coding: 3, vision: 0, fast: 9 }, judge: 2 },
  { id: 'llama-3.2-3b', name: 'Llama 3.2 3B', maker: 'Meta', params: '3B', category: 'small', repo: 'unsloth/Llama-3.2-3B-Instruct-GGUF', quant: 'Q4_K_M', sizeGB: 2.0, ctx: 131072,
    blurb: 'Quick, friendly and good with long documents for its size.', jobs: { general: 5, office: 5, research: 4, coding: 3, vision: 0, fast: 8 }, judge: 3 },
  { id: 'phi-4-mini', name: 'Phi-4 Mini', maker: 'Microsoft', params: '3.8B', category: 'small', repo: 'unsloth/Phi-4-mini-instruct-GGUF', quant: 'Q4_K_M', sizeGB: 2.5, ctx: 131072,
    blurb: 'Strong at maths, logic and step-by-step answers for a small model.', jobs: { general: 5, office: 6, research: 5, coding: 5, vision: 0, fast: 8 }, judge: 4 },
  { id: 'qwen3-4b', name: 'Qwen3 4B Instruct 2507', maker: 'Alibaba', params: '4B', category: 'small', repo: 'unsloth/Qwen3-4B-Instruct-2507-GGUF', quant: 'Q4_K_M', sizeGB: 2.5, ctx: 262144,
    blurb: 'The best all-rounder under 3 GB, on par with older 8B models. Huge context window.', jobs: { general: 7, office: 7, research: 7, coding: 7, vision: 0, fast: 8 }, judge: 6 },

  // The models from Quicksilver 1.0, kept for anyone who prefers them (newer ones above are usually better).
  { id: 'llama-3.2-1b', name: 'Llama 3.2 1B', maker: 'Meta', params: '1B', category: 'small', repo: 'bartowski/Llama-3.2-1B-Instruct-GGUF', quant: 'Q4_K_M', sizeGB: 0.8, ctx: 131072,
    blurb: 'The smallest here. Very fast on any PC, but keeps things simple.', jobs: { general: 3, office: 3, research: 2, coding: 2, vision: 0, fast: 10 }, judge: 1 },
  { id: 'qwen2.5-3b', name: 'Qwen2.5 3B', maker: 'Alibaba', params: '3B', category: 'small', repo: 'bartowski/Qwen2.5-3B-Instruct-GGUF', quant: 'Q4_K_M', sizeGB: 1.9, ctx: 32768,
    blurb: 'Small model that punches above its weight at facts, maths and structure.', jobs: { general: 5, office: 5, research: 4, coding: 4, vision: 0, fast: 8 }, judge: 3 },
  { id: 'phi-3.5-mini', name: 'Phi-3.5 Mini', maker: 'Microsoft', params: '3.8B', category: 'small', repo: 'bartowski/Phi-3.5-mini-instruct-GGUF', quant: 'Q4_K_M', sizeGB: 2.4, ctx: 131072,
    blurb: 'Compact reasoner, good at explaining step by step.', jobs: { general: 4, office: 5, research: 4, coding: 4, vision: 0, fast: 8 }, judge: 3 },
  { id: 'qwen2.5-7b', name: 'Qwen2.5 7B', maker: 'Alibaba', params: '7B', category: 'general', repo: 'bartowski/Qwen2.5-7B-Instruct-GGUF', quant: 'Q4_K_M', sizeGB: 4.7, ctx: 32768,
    blurb: 'Sharp all-rounder: knowledge, maths, code and long answers.', jobs: { general: 6, office: 6, research: 6, coding: 6, vision: 0, fast: 5 }, judge: 5 },
  { id: 'gemma-2-9b', name: 'Gemma 2 9B', maker: 'Google', params: '9B', category: 'general', repo: 'bartowski/gemma-2-9b-it-GGUF', quant: 'Q4_K_M', sizeGB: 5.8, ctx: 8192,
    blurb: 'Polished, articulate writer with good judgment.', jobs: { general: 6, office: 6, research: 6, coding: 5, vision: 0, fast: 4 }, judge: 5 },
  { id: 'qwen2.5-14b', name: 'Qwen2.5 14B', maker: 'Alibaba', params: '14B', category: 'general', repo: 'bartowski/Qwen2.5-14B-Instruct-GGUF', quant: 'Q4_K_M', sizeGB: 9.0, ctx: 32768,
    blurb: 'Big, knowledgeable model. Needs a graphics card (GPU) with about 12 GB of its own memory, or lots of system memory.', jobs: { general: 7, office: 7, research: 7, coding: 7, vision: 0, fast: 3 }, judge: 7 },

  // General purpose
  { id: 'qwen3-8b', name: 'Qwen3 8B', maker: 'Alibaba', params: '8B', category: 'general', repo: 'unsloth/Qwen3-8B-GGUF', quant: 'Q4_K_M', sizeGB: 5.0, ctx: 32768, reasoning: true,
    blurb: 'Sharp everyday model with an optional thinking mode for hard questions.', jobs: { general: 7, office: 7, research: 7, coding: 7, vision: 0, fast: 5 }, judge: 6 },
  { id: 'llama-3.1-8b', name: 'Llama 3.1 8B', maker: 'Meta', params: '8B', category: 'general', repo: 'unsloth/Llama-3.1-8B-Instruct-GGUF', quant: 'Q4_K_M', sizeGB: 4.9, ctx: 131072,
    blurb: 'Natural writing and a 128K context for long reports.', jobs: { general: 7, office: 7, research: 6, coding: 5, vision: 0, fast: 5 }, judge: 5 },
  { id: 'phi-4', name: 'Phi-4 14B', maker: 'Microsoft', params: '14B', category: 'general', repo: 'unsloth/phi-4-GGUF', quant: 'Q4_K_M', sizeGB: 9.1, ctx: 16384,
    blurb: 'Excellent reasoning, maths and analysis. A great stack lead.', jobs: { general: 8, office: 8, research: 8, coding: 7, vision: 0, fast: 3 }, judge: 8 },
  { id: 'qwen3-14b', name: 'Qwen3 14B', maker: 'Alibaba', params: '14B', category: 'general', repo: 'unsloth/Qwen3-14B-GGUF', quant: 'Q4_K_M', sizeGB: 9.0, ctx: 32768, reasoning: true,
    blurb: 'Big step up in knowledge and judgment. Thinks through hard problems.', jobs: { general: 8, office: 8, research: 8, coding: 8, vision: 0, fast: 3 }, judge: 8 },
  { id: 'gpt-oss-20b', name: 'gpt-oss 20B', maker: 'OpenAI', params: '21B (3.6B active)', category: 'general', repo: 'ggml-org/gpt-oss-20b-GGUF', quant: null, sizeGB: 12.1, activeGB: 2.4, ctx: 131072, reasoning: true,
    blurb: 'OpenAI\'s open model. Strong reasoning and tool use, fast for its size.', jobs: { general: 8, office: 8, research: 8, coding: 8, vision: 0, fast: 5 }, judge: 8 },
  { id: 'qwen3-30b-a3b', name: 'Qwen3 30B-A3B Instruct 2507', maker: 'Alibaba', params: '30B (3B active)', category: 'large', repo: 'unsloth/Qwen3-30B-A3B-Instruct-2507-GGUF', quant: 'Q4_K_M', sizeGB: 18.6, activeGB: 2.0, ctx: 262144,
    blurb: 'Big-model quality at small-model speed. One of the best local models.', jobs: { general: 9, office: 9, research: 9, coding: 8, vision: 0, fast: 6 }, judge: 9 },
  { id: 'qwen3-32b', name: 'Qwen3 32B', maker: 'Alibaba', params: '32B', category: 'large', repo: 'unsloth/Qwen3-32B-GGUF', quant: 'Q4_K_M', sizeGB: 19.8, ctx: 32768, reasoning: true,
    blurb: 'Dense heavyweight with deep reasoning. Needs a graphics card (GPU) with 24 GB of its own memory to be quick.', jobs: { general: 9, office: 9, research: 9, coding: 9, vision: 0, fast: 1 }, judge: 9 },

  // Reasoning
  { id: 'deepseek-r1-qwen-14b', name: 'DeepSeek R1 Distill 14B', maker: 'DeepSeek', params: '14B', category: 'reasoning', repo: 'unsloth/DeepSeek-R1-Distill-Qwen-14B-GGUF', quant: 'Q4_K_M', sizeGB: 9.0, ctx: 32768, reasoning: true, thinksLong: true,
    blurb: 'Works problems out step by step before answering. Great for maths and logic.', jobs: { general: 7, office: 7, research: 8, coding: 7, vision: 0, fast: 2 }, judge: 7 },
  { id: 'qwen3-30b-a3b-thinking', name: 'Qwen3 30B-A3B Thinking 2507', maker: 'Alibaba', params: '30B (3B active)', category: 'reasoning', repo: 'unsloth/Qwen3-30B-A3B-Thinking-2507-GGUF', quant: 'Q4_K_M', sizeGB: 18.6, activeGB: 2.0, ctx: 262144, reasoning: true, thinksLong: true,
    blurb: 'Deep, careful reasoning on hard analysis, still quick thanks to its design.', jobs: { general: 8, office: 9, research: 9, coding: 8, vision: 0, fast: 4 }, judge: 9 },
  { id: 'gpt-oss-120b', name: 'gpt-oss 120B', maker: 'OpenAI', params: '117B (5.1B active)', category: 'large', repo: 'ggml-org/gpt-oss-120b-GGUF', quant: null, sizeGB: 63.4, activeGB: 3.5, ctx: 131072, reasoning: true,
    blurb: 'Near-frontier reasoning. For workstations with 64 GB+ of memory.', jobs: { general: 10, office: 10, research: 10, coding: 9, vision: 0, fast: 3 }, judge: 10 },
  { id: 'qwen3-235b-a22b', name: 'Qwen3 235B-A22B Instruct 2507', maker: 'Alibaba', params: '235B (22B active)', category: 'large', repo: 'unsloth/Qwen3-235B-A22B-Instruct-2507-GGUF', quant: 'Q2_K_XL', sizeGB: 88, activeGB: 9, ctx: 262144,
    blurb: 'Flagship-class open model. Only for very high-memory machines.', jobs: { general: 10, office: 10, research: 10, coding: 10, vision: 0, fast: 1 }, judge: 10 },

  // Coding
  { id: 'qwen2.5-coder-7b', name: 'Qwen2.5 Coder 7B', maker: 'Alibaba', params: '7B', category: 'coding', repo: 'unsloth/Qwen2.5-Coder-7B-Instruct-GGUF', quant: 'Q4_K_M', sizeGB: 4.7, ctx: 32768,
    blurb: 'Writes, fixes and explains code in dozens of languages.', jobs: { general: 5, office: 5, research: 5, coding: 8, vision: 0, fast: 5 }, judge: 5 },
  { id: 'qwen2.5-coder-14b', name: 'Qwen2.5 Coder 14B', maker: 'Alibaba', params: '14B', category: 'coding', repo: 'unsloth/Qwen2.5-Coder-14B-Instruct-GGUF', quant: 'Q4_K_M', sizeGB: 9.0, ctx: 32768,
    blurb: 'Stronger coder for bigger projects and trickier bugs.', jobs: { general: 6, office: 6, research: 6, coding: 9, vision: 0, fast: 3 }, judge: 6 },
  { id: 'qwen3-coder-30b', name: 'Qwen3 Coder 30B-A3B', maker: 'Alibaba', params: '30B (3B active)', category: 'coding', repo: 'unsloth/Qwen3-Coder-30B-A3B-Instruct-GGUF', quant: 'Q4_K_M', sizeGB: 18.6, activeGB: 2.0, ctx: 262144,
    blurb: 'Top open coding model that still runs fast. Handles whole codebases.', jobs: { general: 7, office: 7, research: 7, coding: 10, vision: 0, fast: 5 }, judge: 8 },

  // Unfiltered: community models that follow your instructions with far fewer refusals.
  // Uncensored Qwen3 (abliterated by huihui-ai, the same source as Quicksilver's built-in models).
  // They join the Quicksilver crew, and the built-in Qwen3-VL 2B drafts ahead for the 8B and 14B.
  // 'alt' lists other copies to try if the first isn't available; the installer build checks them.
  { id: 'qwen3-8b-uncensored', name: 'Qwen3 8B (uncensored)', maker: 'Alibaba · uncensored by huihui-ai', params: '8B', category: 'open', repo: 'mradermacher/Huihui-Qwen3-8B-abliterated-v2-GGUF', alt: ['mradermacher/Qwen3-8B-abliterated-GGUF', 'mradermacher/Huihui-Qwen3-8B-abliterated-GGUF'], verify: true, quant: 'Q4_K_M', sizeGB: 5.0, ctx: 32768, reasoning: true, open: true,
    blurb: 'Qwen3 8B with the refusals taken out: answers plainly, thinks through hard questions. Joins the Quicksilver crew, and the built-in model speeds it up.', jobs: { general: 7, office: 7, research: 7, coding: 7, vision: 0, fast: 5 }, judge: 6 },
  { id: 'qwen3-14b-uncensored', name: 'Qwen3 14B (uncensored)', maker: 'Alibaba · uncensored by huihui-ai', params: '14B', category: 'open', repo: 'mradermacher/Huihui-Qwen3-14B-abliterated-v2-GGUF', alt: ['mradermacher/Qwen3-14B-abliterated-GGUF', 'mradermacher/Huihui-Qwen3-14B-abliterated-GGUF'], verify: true, quant: 'Q4_K_M', sizeGB: 9.0, ctx: 32768, reasoning: true, open: true,
    blurb: 'Qwen3 14B uncensored: a big step up in knowledge and judgment. Leads the Quicksilver crew on hard questions on a 12 GB graphics card.', jobs: { general: 8, office: 8, research: 8, coding: 8, vision: 0, fast: 3 }, judge: 8 },
  { id: 'qwen3-30b-a3b-uncensored', name: 'Qwen3 30B-A3B Instruct 2507 (uncensored)', maker: 'Alibaba · uncensored by huihui-ai', params: '30B (3B active)', category: 'open', repo: 'mradermacher/Huihui-Qwen3-30B-A3B-Instruct-2507-abliterated-GGUF', alt: ['mradermacher/Qwen3-30B-A3B-Instruct-2507-abliterated-GGUF'], verify: true, quant: 'Q4_K_M', sizeGB: 18.6, activeGB: 2.0, ctx: 262144, open: true,
    blurb: 'Big-model quality at small-model speed, uncensored. The strongest Closer for the Quicksilver crew.', jobs: { general: 9, office: 9, research: 9, coding: 8, vision: 0, fast: 6 }, judge: 9 },
  { id: 'hermes-3-llama-3.1-8b', name: 'Hermes 3 8B', maker: 'Nous Research', params: '8B', category: 'open', repo: 'NousResearch/Hermes-3-Llama-3.1-8B-GGUF', quant: 'Q4_K_M', sizeGB: 4.9, ctx: 131072, open: true,
    blurb: 'Highly steerable: follows your instructions and persona closely, with few refusals.', jobs: { general: 7, office: 6, research: 6, coding: 5, vision: 0, fast: 5 }, judge: 6 },
  { id: 'dolphin-3-llama-3.1-8b', name: 'Dolphin 3.0 8B', maker: 'Cognitive Computations', params: '8B', category: 'open', repo: 'bartowski/Dolphin3.0-Llama3.1-8B-GGUF', quant: 'Q4_K_M', sizeGB: 4.9, ctx: 131072, open: true,
    blurb: 'Uncensored general model: answers frankly and leaves the judgment to you.', jobs: { general: 7, office: 6, research: 6, coding: 6, vision: 0, fast: 5 }, judge: 5 },
  { id: 'mistral-nemo-12b', name: 'Mistral Nemo 12B', maker: 'Mistral AI', params: '12B', category: 'open', repo: 'bartowski/Mistral-Nemo-Instruct-2407-GGUF', quant: 'Q4_K_M', sizeGB: 7.5, ctx: 131072, open: true,
    blurb: 'Lightly filtered and great at writing and fiction, with a long memory.', jobs: { general: 7, office: 7, research: 6, coding: 6, vision: 0, fast: 4 }, judge: 6 },

  // Vision (see photos, scans, charts and video frames)
  { id: 'qwen3-vl-2b', name: 'Qwen3-VL 2B', maker: 'Alibaba', params: '2B', category: 'vision', repo: 'Qwen/Qwen3-VL-2B-Instruct-GGUF', quant: 'Q4_K_M', sizeGB: 1.1, mmprojGB: 0.45, vision: true, ctx: 262144,
    blurb: 'Comes with Quicksilver. Small and quick on any PC, and it sees photos, screenshots and charts.', jobs: { general: 5, office: 5, research: 4, coding: 4, vision: 6, fast: 9 }, judge: 3 },
  { id: 'gemma-3-4b', name: 'Gemma 3 4B (vision)', maker: 'Google', params: '4B', category: 'vision', repo: 'unsloth/gemma-3-4b-it-GGUF', quant: 'Q4_K_M', sizeGB: 2.5, mmprojGB: 0.8, vision: true, ctx: 131072,
    blurb: 'Sees photos, screenshots and documents. Small enough for most PCs.', jobs: { general: 6, office: 6, research: 5, coding: 4, vision: 7, fast: 7 }, judge: 4 },
  { id: 'qwen2.5-vl-7b', name: 'Qwen2.5 VL 7B (vision)', maker: 'Alibaba', params: '7B', category: 'vision', repo: 'unsloth/Qwen2.5-VL-7B-Instruct-GGUF', quant: 'Q4_K_M', sizeGB: 4.7, mmprojGB: 1.4, vision: true, ctx: 32768,
    blurb: 'Excellent at reading text, tables and charts in images.', jobs: { general: 6, office: 8, research: 7, coding: 5, vision: 9, fast: 4 }, judge: 5 },
  { id: 'gemma-3-12b', name: 'Gemma 3 12B (vision)', maker: 'Google', params: '12B', category: 'vision', repo: 'unsloth/gemma-3-12b-it-GGUF', quant: 'Q4_K_M', sizeGB: 7.3, mmprojGB: 0.9, vision: true, ctx: 131072,
    blurb: 'Strong all-rounder that also understands images well.', jobs: { general: 8, office: 8, research: 7, coding: 6, vision: 8, fast: 3 }, judge: 7 },
  { id: 'mistral-small-3.2', name: 'Mistral Small 3.2 24B (vision)', maker: 'Mistral AI', params: '24B', category: 'vision', repo: 'unsloth/Mistral-Small-3.2-24B-Instruct-2506-GGUF', quant: 'Q4_K_M', sizeGB: 14.3, mmprojGB: 0.9, vision: true, ctx: 131072, open: true,
    blurb: 'Precise, professional and sees images. Great for business documents.', jobs: { general: 9, office: 9, research: 8, coding: 8, vision: 8, fast: 2 }, judge: 8 },
  { id: 'gemma-3-27b', name: 'Gemma 3 27B (vision)', maker: 'Google', params: '27B', category: 'vision', repo: 'unsloth/gemma-3-27b-it-GGUF', quant: 'Q4_K_M', sizeGB: 16.5, mmprojGB: 0.9, vision: true, ctx: 131072,
    blurb: 'Google\'s largest open model. Top-tier vision and writing.', jobs: { general: 9, office: 9, research: 9, coding: 7, vision: 9, fast: 1 }, judge: 9 },

  // ---------- more uncensored community models ----------
  { id: 'hermes-3-llama-3.2-3b', name: 'Hermes 3 3B', maker: 'Nous Research', params: '3B', category: 'open', repo: 'NousResearch/Hermes-3-Llama-3.2-3B-GGUF', quant: 'Q4_K_M', sizeGB: 2.0, ctx: 131072, open: true,
    blurb: 'Small and steerable with few refusals. Runs on laptops.', jobs: { general: 5, office: 4, research: 4, coding: 3, vision: 0, fast: 8 }, judge: 3 },
  { id: 'dolphin-3-qwen2.5-3b', name: 'Dolphin 3.0 3B', maker: 'Cognitive Computations', params: '3B', category: 'open', repo: 'bartowski/Dolphin3.0-Qwen2.5-3b-GGUF', quant: 'Q4_K_M', sizeGB: 1.9, ctx: 32768, open: true,
    blurb: 'Uncensored general assistant in a small size: you set the rules in the system prompt.', jobs: { general: 5, office: 4, research: 4, coding: 4, vision: 0, fast: 8 }, judge: 3 },
  { id: 'rocinante-12b', name: 'Rocinante 12B', maker: 'TheDrummer', params: '12B', category: 'open', repo: 'TheDrummer/Rocinante-12B-v1.1-GGUF', quant: 'Q4_K_M', sizeGB: 7.5, ctx: 32768, open: true,
    blurb: 'A favourite for stories and role-play: vivid prose, few refusals.', jobs: { general: 7, office: 5, research: 5, coding: 4, vision: 0, fast: 4 }, judge: 5 },
  { id: 'hermes-4-14b', name: 'Hermes 4 14B', maker: 'Nous Research', params: '14B', category: 'open', repo: 'NousResearch/Hermes-4-14B-GGUF', quant: 'Q4_K_M', sizeGB: 9.0, ctx: 40960, open: true, reasoning: true,
    blurb: 'Newest Hermes: strong reasoning and writing, highly steerable, few refusals.', jobs: { general: 8, office: 7, research: 7, coding: 7, vision: 0, fast: 3 }, judge: 7 },
  { id: 'dolphin-3-mistral-24b', name: 'Dolphin 3.0 Mistral 24B', maker: 'Cognitive Computations', params: '24B', category: 'open', repo: 'bartowski/cognitivecomputations_Dolphin3.0-Mistral-24B-GGUF', quant: 'Q4_K_M', sizeGB: 14.3, ctx: 32768, open: true,
    blurb: 'The strongest Dolphin: an uncensored, capable assistant for 16 GB+ graphics cards.', jobs: { general: 8, office: 8, research: 7, coding: 7, vision: 0, fast: 2 }, judge: 8 },

  // ---------- more of the most popular open models ----------
  // Small
  { id: 'gemma-3-1b', name: 'Gemma 3 1B', maker: 'Google', params: '1B', category: 'small', repo: 'unsloth/gemma-3-1b-it-GGUF', quant: 'Q4_K_M', sizeGB: 0.8, ctx: 32768,
    blurb: 'Google\'s tiniest model. Instant answers on any PC, good for simple tasks.', jobs: { general: 4, office: 3, research: 3, coding: 2, vision: 0, fast: 10 }, judge: 2 },
  { id: 'smollm3-3b', name: 'SmolLM3 3B', maker: 'Hugging Face', params: '3B', category: 'small', repo: 'unsloth/SmolLM3-3B-GGUF', quant: 'Q4_K_M', sizeGB: 1.9, ctx: 65536, reasoning: true,
    blurb: 'Fully open small model that can think before answering. Strong for its size.', jobs: { general: 5, office: 5, research: 5, coding: 4, vision: 0, fast: 8 }, judge: 4 },
  { id: 'qwen2.5-coder-1.5b', name: 'Qwen2.5 Coder 1.5B', maker: 'Alibaba', params: '1.5B', category: 'coding', repo: 'unsloth/Qwen2.5-Coder-1.5B-Instruct-GGUF', quant: 'Q4_K_M', sizeGB: 1.0, ctx: 32768,
    blurb: 'Tiny and instant: quick code completions, small fixes and tests on any PC.', jobs: { general: 3, office: 3, research: 2, coding: 5, vision: 0, fast: 9 }, judge: 2 },
  { id: 'qwen2.5-coder-3b', name: 'Qwen2.5 Coder 3B', maker: 'Alibaba', params: '3B', category: 'coding', repo: 'unsloth/Qwen2.5-Coder-3B-Instruct-GGUF', quant: 'Q4_K_M', sizeGB: 1.9, ctx: 32768,
    blurb: 'A small coding helper that runs on laptops: scripts, fixes and explanations.', jobs: { general: 4, office: 4, research: 3, coding: 6, vision: 0, fast: 8 }, judge: 3 },
  { id: 'qwen3-4b-thinking', name: 'Qwen3 4B Thinking 2507', maker: 'Alibaba', params: '4B', category: 'reasoning', repo: 'unsloth/Qwen3-4B-Thinking-2507-GGUF', quant: 'Q4_K_M', sizeGB: 2.5, ctx: 262144, reasoning: true, thinksLong: true,
    blurb: 'Small model that reasons step by step: surprisingly good at maths and logic.', jobs: { general: 6, office: 6, research: 7, coding: 7, vision: 0, fast: 6 }, judge: 6 },
  { id: 'gemma-3n-e4b', name: 'Gemma 3n E4B', maker: 'Google', params: '8B (4B effective)', category: 'small', repo: 'unsloth/gemma-3n-E4B-it-GGUF', quant: 'Q4_K_M', sizeGB: 4.5, ctx: 32768,
    blurb: 'Built for phones and laptops: 8B quality in the memory of a 4B model.', jobs: { general: 6, office: 6, research: 5, coding: 5, vision: 0, fast: 7 }, judge: 5 },
  // General
  { id: 'mistral-7b', name: 'Mistral 7B v0.3', maker: 'Mistral AI', params: '7B', category: 'general', repo: 'bartowski/Mistral-7B-Instruct-v0.3-GGUF', quant: 'Q4_K_M', sizeGB: 4.4, ctx: 32768,
    blurb: 'The classic open model: quick, fluent and easy to steer.', jobs: { general: 6, office: 5, research: 5, coding: 5, vision: 0, fast: 6 }, judge: 4 },
  { id: 'granite-3.3-8b', name: 'Granite 3.3 8B', maker: 'IBM', params: '8B', category: 'general', repo: 'ibm-granite/granite-3.3-8b-instruct-GGUF', quant: 'Q4_K_M', sizeGB: 4.9, ctx: 131072, reasoning: true,
    blurb: 'Business-focused: documents, summaries, RAG and tool use, with a 128K context.', jobs: { general: 6, office: 7, research: 7, coding: 6, vision: 0, fast: 5 }, judge: 6 },
  { id: 'glm-4-9b', name: 'GLM-4 9B 0414', maker: 'Zhipu AI', params: '9B', category: 'general', repo: 'unsloth/GLM-4-9B-0414-GGUF', quant: 'Q4_K_M', sizeGB: 5.7, ctx: 32768,
    blurb: 'Capable all-rounder, good at writing, code and following instructions.', jobs: { general: 7, office: 7, research: 6, coding: 7, vision: 0, fast: 5 }, judge: 6 },
  { id: 'llama-3.3-70b', name: 'Llama 3.3 70B', maker: 'Meta', params: '70B', category: 'large', repo: 'unsloth/Llama-3.3-70B-Instruct-GGUF', quant: 'Q4_K_M', sizeGB: 42.5, ctx: 131072,
    blurb: 'Meta\'s best dense model: excellent writing and knowledge. Needs 48 GB+ of memory.', jobs: { general: 9, office: 9, research: 9, coding: 8, vision: 0, fast: 1 }, judge: 9 },
  { id: 'glm-4.5-air', name: 'GLM-4.5-Air', maker: 'Zhipu AI', params: '106B (12B active)', category: 'large', repo: 'unsloth/GLM-4.5-Air-GGUF', quant: 'Q4_K_M', sizeGB: 72.9, activeGB: 7, ctx: 131072, reasoning: true,
    blurb: 'Top-tier open model for agents, coding and reasoning, fast for its size. For 96 GB+ machines.', jobs: { general: 10, office: 10, research: 9, coding: 10, vision: 0, fast: 3 }, judge: 10 },
  // Reasoning
  { id: 'deepseek-r1-qwen3-8b', name: 'DeepSeek R1 0528 (Qwen3 8B)', maker: 'DeepSeek', params: '8B', category: 'reasoning', repo: 'unsloth/DeepSeek-R1-0528-Qwen3-8B-GGUF', quant: 'Q4_K_M', sizeGB: 5.0, ctx: 131072, reasoning: true, thinksLong: true,
    blurb: 'DeepSeek\'s newest reasoning, distilled into 8B. Excellent at maths for its size.', jobs: { general: 7, office: 7, research: 8, coding: 7, vision: 0, fast: 3 }, judge: 7 },
  { id: 'deepseek-r1-qwen-7b', name: 'DeepSeek R1 Distill 7B', maker: 'DeepSeek', params: '7B', category: 'reasoning', repo: 'unsloth/DeepSeek-R1-Distill-Qwen-7B-GGUF', quant: 'Q4_K_M', sizeGB: 4.7, ctx: 32768, reasoning: true, thinksLong: true,
    blurb: 'Thinks out loud before answering. Good maths and logic on mid-range PCs.', jobs: { general: 5, office: 6, research: 6, coding: 6, vision: 0, fast: 3 }, judge: 5 },
  { id: 'deepseek-r1-qwen-32b', name: 'DeepSeek R1 Distill 32B', maker: 'DeepSeek', params: '32B', category: 'reasoning', repo: 'unsloth/DeepSeek-R1-Distill-Qwen-32B-GGUF', quant: 'Q4_K_M', sizeGB: 19.9, ctx: 32768, reasoning: true, thinksLong: true,
    blurb: 'Deep, careful reasoning for hard problems. Best with a 24 GB graphics card.', jobs: { general: 8, office: 8, research: 9, coding: 8, vision: 0, fast: 1 }, judge: 9 },
  { id: 'phi-4-reasoning-plus', name: 'Phi-4 Reasoning Plus', maker: 'Microsoft', params: '14B', category: 'reasoning', repo: 'unsloth/Phi-4-reasoning-plus-GGUF', quant: 'Q4_K_M', sizeGB: 9.1, ctx: 32768, reasoning: true, thinksLong: true,
    blurb: 'Microsoft\'s reasoning specialist: top-class maths and science for a 14B model.', jobs: { general: 7, office: 8, research: 8, coding: 8, vision: 0, fast: 2 }, judge: 8 },
  { id: 'qwq-32b', name: 'QwQ 32B', maker: 'Alibaba', params: '32B', category: 'reasoning', repo: 'unsloth/QwQ-32B-GGUF', quant: 'Q4_K_M', sizeGB: 19.9, ctx: 131072, reasoning: true, thinksLong: true,
    blurb: 'Famous open reasoner: long, careful thinking on hard maths and logic.', jobs: { general: 8, office: 8, research: 9, coding: 8, vision: 0, fast: 1 }, judge: 9 },
  { id: 'magistral-small', name: 'Magistral Small 2509', maker: 'Mistral AI', params: '24B', category: 'reasoning', repo: 'unsloth/Magistral-Small-2509-GGUF', quant: 'Q4_K_M', sizeGB: 14.3, ctx: 131072, reasoning: true, thinksLong: true,
    blurb: 'Mistral\'s reasoning model: transparent step-by-step thinking in many languages.', jobs: { general: 8, office: 8, research: 9, coding: 8, vision: 0, fast: 2 }, judge: 8 },
  // Coding
  { id: 'devstral-small', name: 'Devstral Small 2507', maker: 'Mistral AI', params: '24B', category: 'coding', repo: 'unsloth/Devstral-Small-2507-GGUF', quant: 'Q4_K_M', sizeGB: 14.3, ctx: 131072,
    blurb: 'Built for coding agents: works across whole projects, edits files and fixes bugs.', jobs: { general: 7, office: 7, research: 6, coding: 9, vision: 0, fast: 2 }, judge: 7 },
  { id: 'qwen2.5-coder-32b', name: 'Qwen2.5 Coder 32B', maker: 'Alibaba', params: '32B', category: 'coding', repo: 'unsloth/Qwen2.5-Coder-32B-Instruct-GGUF', quant: 'Q4_K_M', sizeGB: 19.9, ctx: 32768,
    blurb: 'A favourite for serious coding on a 24 GB graphics card.', jobs: { general: 7, office: 7, research: 7, coding: 10, vision: 0, fast: 1 }, judge: 8 },
  // Vision
  { id: 'qwen3-vl-4b', name: 'Qwen3-VL 4B', maker: 'Alibaba', params: '4B', category: 'vision', repo: 'Qwen/Qwen3-VL-4B-Instruct-GGUF', quant: 'Q4_K_M', sizeGB: 2.5, mmprojGB: 0.8, vision: true, ctx: 262144,
    blurb: 'Reads photos, documents and charts well, and answers quickly.', jobs: { general: 6, office: 7, research: 6, coding: 5, vision: 8, fast: 7 }, judge: 5 },
  { id: 'qwen3-vl-8b', name: 'Qwen3-VL 8B', maker: 'Alibaba', params: '8B', category: 'vision', repo: 'Qwen/Qwen3-VL-8B-Instruct-GGUF', quant: 'Q4_K_M', sizeGB: 5.0, mmprojGB: 1.2, vision: true, ctx: 262144,
    blurb: 'One of the best models at seeing: documents, screenshots, charts and video frames.', jobs: { general: 7, office: 8, research: 7, coding: 6, vision: 9, fast: 5 }, judge: 6 },
];

const TEXT_CATEGORIES = {
  small: { label: 'Small & fast', icon: '⚡', note: 'Under 5 GB: laptops and older PCs.' },
  general: { label: 'Everyday', icon: '💬', note: 'Strong all-rounders for most PCs.' },
  large: { label: 'Big & powerful', icon: '🚀', note: 'The strongest open models, for PCs with lots of memory.' },
  reasoning: { label: 'Reasoning', icon: '🧠', note: 'Think step by step: maths, logic, hard questions.' },
  coding: { label: 'Coding', icon: '💻', note: 'Write, fix and explain code; build apps.' },
  vision: { label: 'Vision (photos & video)', icon: '👁️', note: 'See photos, screenshots, documents and video.' },
  open: { label: 'Uncensored', icon: '🔓', note: 'Community models with far fewer refusals: fiction, role-play, frank answers.' },
};

// ---------- image and video models (stable-diffusion.cpp) ----------
// files: role -> { repo, match } (match is a regex source string against the path in the repo).
// recipe: how the engine is called. refSec: seconds per image (or per clip) on a mid-range 12 GB card.

const FLUX_ENCODERS = {
  vae: { repo: 'black-forest-labs/FLUX.1-schnell', match: '^ae\\.safetensors$' },
  clip_l: { repo: 'comfyanonymous/flux_text_encoders', match: '^clip_l\\.safetensors$' },
  t5xxl: { repo: 'city96/t5-v1_1-xxl-encoder-gguf', match: 'Q4_K_M\\.gguf$' },
};

const MEDIA_MODELS = [
  { id: 'sd15', quality: 4, name: 'Stable Diffusion 1.5', maker: 'Stability AI / RunwayML', kind: 'image', category: 'image', recipe: 'sd', sizeGB: 4.3, vramGB: 3, refSec: 4, defaults: { width: 512, height: 512, steps: 25, cfg: 7 },
    files: { model: { repo: 'stable-diffusion-v1-5/stable-diffusion-v1-5', match: '^v1-5-pruned-emaonly\\.safetensors$' } },
    blurb: 'The classic. Fast, light, endless styles. Runs well even on older graphics cards (the GPU, the chip that draws the screen) with as little as 4 GB of memory.', edit: 'img2img' },
  { id: 'sdxl-turbo', quality: 6, name: 'SDXL Turbo', maker: 'Stability AI', kind: 'image', category: 'image', recipe: 'sd', sizeGB: 6.9, vramGB: 6, refSec: 3, defaults: { width: 512, height: 512, steps: 4, cfg: 1 },
    files: { model: { repo: 'stabilityai/sdxl-turbo', match: '^sd_xl_turbo_1\\.0_fp16\\.safetensors$' } },
    blurb: 'Pictures in a few seconds. Great for quick ideas and drafts.', edit: 'img2img' },
  { id: 'sdxl', quality: 7, name: 'SDXL 1.0', maker: 'Stability AI', kind: 'image', category: 'image', recipe: 'sd', sizeGB: 7.1, vramGB: 8, refSec: 25, defaults: { width: 1024, height: 1024, steps: 30, cfg: 6 },
    files: { model: { repo: 'stabilityai/stable-diffusion-xl-base-1.0', match: '^sd_xl_base_1\\.0\\.safetensors$' }, vae: { repo: 'madebyollin/sdxl-vae-fp16-fix', match: '^sdxl_vae\\.safetensors$' } },
    blurb: 'High-resolution, detailed images with good composition.', edit: 'img2img' },
  { id: 'flux-schnell', quality: 9, name: 'FLUX.1 Schnell', maker: 'Black Forest Labs', kind: 'image', category: 'image', recipe: 'flux', sizeGB: 13.5, vramGB: 10, refSec: 20, defaults: { width: 1024, height: 1024, steps: 4, cfg: 1 },
    files: { diffusion: { repo: 'city96/FLUX.1-schnell-gguf', match: 'Q4_K_S\\.gguf$' }, ...FLUX_ENCODERS },
    blurb: 'State-of-the-art quality in 4 steps. Follows prompts closely and can write text in images.', edit: 'img2img' },
  { id: 'flux-kontext', quality: 8, name: 'FLUX.1 Kontext (photo editing)', maker: 'Black Forest Labs', kind: 'image', category: 'edit', recipe: 'kontext', sizeGB: 13.5, vramGB: 10, refSec: 60, defaults: { width: 1024, height: 1024, steps: 20, cfg: 1 },
    files: { diffusion: { repo: 'QuantStack/FLUX.1-Kontext-dev-GGUF', match: 'Q4_K_S\\.gguf$' }, ...FLUX_ENCODERS },
    blurb: 'Edit photos by describing the change: "make it sunset", "remove the person", "turn it into a watercolor".', edit: 'instruct' },
  { id: 'qwen-image-edit', quality: 9, name: 'Qwen Image Edit', maker: 'Alibaba', kind: 'image', category: 'edit', recipe: 'qwen-image', sizeGB: 20.5, vramGB: 16, refSec: 90, defaults: { width: 1024, height: 1024, steps: 20, cfg: 2.5 },
    files: { diffusion: { repo: 'QuantStack/Qwen-Image-Edit-GGUF', match: 'Q4_K_M\\.gguf$' }, vae: { repo: 'Comfy-Org/Qwen-Image_ComfyUI', match: 'qwen_image_vae\\.safetensors$' }, llm: { repo: 'unsloth/Qwen2.5-VL-7B-Instruct-GGUF', match: 'Q4_K_M\\.gguf$' } },
    blurb: 'Powerful instruction editing, including changing and adding text in images.', edit: 'instruct' },
  { id: 'wan2.1-1.3b', quality: 6, name: 'Wan 2.1 Text-to-Video 1.3B', maker: 'Alibaba', kind: 'video', category: 'video', recipe: 'wan', sizeGB: 7.0, vramGB: 8, refSec: 240, defaults: { width: 832, height: 480, steps: 20, cfg: 6, frames: 33, fps: 16 },
    files: { diffusion: { repo: 'Comfy-Org/Wan_2.1_ComfyUI_repackaged', match: 'wan2\\.1_t2v_1\\.3B_fp16\\.safetensors$' }, vae: { repo: 'Comfy-Org/Wan_2.1_ComfyUI_repackaged', match: 'wan_2\\.1_vae\\.safetensors$' }, t5xxl: { repo: 'city96/umt5-xxl-encoder-gguf', match: 'Q4_K_M\\.gguf$' } },
    blurb: 'Short video clips from a description. Fits on graphics cards (GPUs) with 8 GB of their own memory.' },
  { id: 'wan2.2-5b', quality: 8, name: 'Wan 2.2 Text/Image-to-Video 5B', maker: 'Alibaba', kind: 'video', category: 'video', recipe: 'wan', sizeGB: 9.5, vramGB: 12, refSec: 420, defaults: { width: 1280, height: 704, steps: 20, cfg: 5, frames: 49, fps: 24 },
    files: { diffusion: { repo: 'QuantStack/Wan2.2-TI2V-5B-GGUF', match: 'Q4_K_M\\.gguf$' }, vae: { repo: 'Comfy-Org/Wan_2.2_ComfyUI_Repackaged', match: 'wan2\\.2_vae\\.safetensors$' }, t5xxl: { repo: 'city96/umt5-xxl-encoder-gguf', match: 'Q4_K_M\\.gguf$' } },
    blurb: 'Higher-quality 720p clips, from text or by animating a photo.', animate: true },
];

const MEDIA_CATEGORIES = {
  image: { label: 'Image generation', icon: '🎨' },
  edit: { label: 'Photo editing (AI)', icon: '🪄' },
  video: { label: 'Video generation', icon: '🎬' },
};

// ---------- stack types ----------
// Kinds of work, not topics. Text stacks combine language models; media stacks are a kit of
// image and video models plus a small text model that writes better prompts.
// speed: writing speed (tokens/s) at which a model counts as quick enough for this work.
// budget: the longest a full stacked answer should take on this PC, in seconds.

const JOBS = {
  general: { kind: 'text', words: 300, label: 'Everyday', icon: '⚡', pitch: 'Quick, reliable answers for questions, advice and small tasks.', speed: 25, budget: 60, temperature: 0.7, contextSize: 16384, maxTokens: 4096, library: false, web: true, mode: 'blend',
    assistant: { name: 'Quicksilver', emoji: '💧', instructions: 'You are Quicksilver, a capable, honest assistant running privately on the user\'s computer. Give clear, direct, well-organised answers. Check any arithmetic before you give it. If you are unsure, say so instead of guessing.' } },
  // Back from Quicksilver 2.0/2.1: quick answers on modest PCs.
  fast: { kind: 'text', words: 250, label: 'Fast on a modest PC', icon: '🏃', pitch: 'Quick answers on laptops and older computers: the best model that still answers in seconds.', single: true, speed: 30, budget: 30, temperature: 0.6, contextSize: 8192, maxTokens: 2048, library: false, web: true, mode: 'blend',
    assistant: { name: 'Quick Helper', emoji: '🏃', instructions: 'You are a fast, concise assistant. Keep answers short and to the point unless asked for more. Use a short list when it helps. If a question needs a long, careful answer, say so and give the key points first.' } },
  reasoning: { kind: 'text', words: 500, label: 'Reasoning', icon: '🧠', pitch: 'Maths, logic, tricky questions and decisions, worked through step by step.', speed: 8, budget: 240, temperature: 0.3, contextSize: 32768, maxTokens: 8192, library: false, web: false, mode: 'debate',
    assistant: { name: 'Thinker', emoji: '🧠', instructions: 'You are a careful reasoner. Work through problems step by step, state your assumptions, check each step, and verify the final answer (recompute numbers, test edge cases, look for counter-examples). Give the conclusion clearly at the end. If the question is ambiguous, say how you interpreted it.' } },
  office: { kind: 'text', words: 600, label: 'Complex tasks', icon: '🧩', pitch: 'Multi-step projects, analysis, spreadsheets and long documents.', speed: 10, budget: 180, temperature: 0.3, contextSize: 32768, maxTokens: 8192, library: true, web: true, mode: 'blend',
    assistant: { name: 'Analyst', emoji: '🧩', instructions: 'You handle complex, multi-step work. First make a short plan, then carry it out step by step, and finish with a clear result and next steps. With spreadsheets or data, work from the actual numbers: compute totals, changes and outliers carefully and show the figures in Markdown tables. Never invent numbers; if something is missing, say what is needed.' } },
  research: { kind: 'text', words: 500, label: 'Research', icon: '🔎', pitch: 'Answers from the web and your files, with sources and fact checks.', speed: 10, budget: 150, temperature: 0.3, contextSize: 32768, maxTokens: 6144, library: true, web: true, mode: 'consensus',
    assistant: { name: 'Researcher', emoji: '🔎', instructions: 'You are a meticulous research assistant. Base answers on the reference excerpts and search results provided, cite them inline as [1], [2] matching their numbers, and say clearly when the sources do not answer the question. Separate facts from interpretation. End with a short summary.' } },
  writing: { kind: 'text', words: 450, label: 'Writing', icon: '✍️', pitch: 'Emails, posts, letters and documents: drafted, rewritten and polished.', speed: 12, budget: 90, temperature: 0.7, contextSize: 16384, maxTokens: 4096, library: false, web: false, mode: 'blend',
    assistant: { name: 'Writer', emoji: '✍️', instructions: 'You are a skilled writer and editor. Match the tone the user asks for (or the tone of what they paste). Write clearly and concisely, in plain English, with no filler. When editing, keep the user\'s meaning and voice, and briefly list the main changes. For emails, include a subject line.' } },
  // Back from Quicksilver 2.0/2.1: understanding photos, screenshots, scans and video.
  vision: { kind: 'text', words: 350, label: 'Photos & video', icon: '📷', pitch: 'Understand photos, screenshots, scans, charts and video clips.', speed: 10, budget: 120, temperature: 0.4, contextSize: 16384, maxTokens: 4096, library: false, web: false, mode: 'blend',
    assistant: { name: 'Vision Analyst', emoji: '📷', instructions: 'You analyse images and video frames. Describe what matters for the user\'s question, read any text exactly, extract tables and chart values, and note anything unclear. For video, describe what happens over time using the frame timestamps.' } },
  open: { kind: 'text', words: 400, label: 'Unfiltered', icon: '🔓', pitch: 'Models that follow your instructions with far fewer refusals: fiction, mature themes, frank answers.', speed: 12, budget: 120, temperature: 0.8, contextSize: 16384, maxTokens: 4096, library: false, web: false, mode: 'blend', only: 'open',
    assistant: { name: 'Unfiltered', emoji: '🔓', instructions: 'You are a direct, candid assistant. Answer fully and frankly. Do not moralise, lecture or add disclaimers the user did not ask for, and do not water answers down. Follow the user\'s instructions on tone, style, persona and content, including for fiction and mature themes.' } },
  coding: { kind: 'text', words: 700, label: 'App development', icon: '💻', pitch: 'Build apps and websites: plan, write, debug and review code.', speed: 10, budget: 180, temperature: 0.2, contextSize: 32768, maxTokens: 8192, library: false, web: false, mode: 'debate',
    assistant: { name: 'App Builder', emoji: '💻', instructions: 'You are an expert software engineer who builds complete apps. For new work, outline the structure first (files, components, data), then write correct, idiomatic, complete code in fenced code blocks with the file name and language. Explain briefly what changed and why. Point out bugs, edge cases and security issues. Ask a short clarifying question when a request is ambiguous.' } },
  create: { kind: 'media', label: 'Photo & video generation', icon: '🎨', pitch: 'Pictures and short videos from a description, with AI-written prompts.', roles: ['image', 'video', 'helper'] },
  edit: { kind: 'media', label: 'Photo & video editing', icon: '🪄', pitch: 'Change photos by describing the edit, and bring photos to life.', roles: ['edit', 'animate', 'helper'] },
};

// How good a model is at a kind of work (0-10). Writing and reasoning are derived.
const WRITERS = /^(Meta|Google|Mistral AI)$/;
function scoreFor(m, job) {
  const j = m.jobs || {};
  if (job === 'writing') return Math.min(10, (j.general ?? 5) + (WRITERS.test(m.maker || '') ? 1 : 0) - (m.category === 'coding' ? 2 : 0));
  if (job === 'open') return m.open ? (j.general ?? 5) : 0;
  // "Fast" means the best answers that still come quickly: quality, with the speed floor in compose.
  if (job === 'fast') return j.general ?? 5;
  if (job === 'reasoning') return Math.min(10, Math.round(((j.research ?? 5) + (m.judge ?? 5)) / 2) + (m.reasoning ? 1 : 0) - (m.category === 'coding' ? 1 : 0));
  return j[job] ?? j.general ?? 5;
}

// ---------- hardware estimates ----------

// Rough memory bandwidth (GB/s), which is what decides how fast a model writes.
function gpuBandwidth(hw) {
  if (!hw.vramGB) return 0;
  if (hw.unifiedMemory) return hw.ramGB >= 64 ? 400 : 200; // Apple silicon
  const v = hw.vramGB;
  return v >= 20 ? 850 : v >= 14 ? 550 : v >= 10 ? 400 : v >= 7 ? 300 : v >= 5 ? 200 : 120;
}
const CPU_BANDWIDTH = 40;

function usableRam(hw) { return Math.max(0, hw.ramGB * 0.8 - 2); } // leave room for the OS and apps
function usableVram(hw) { return Math.max(0, (hw.vramFreeGB || hw.vramGB) * 0.92 - 0.4); }

// How a text model would run on this PC.
function estimateText(m, hw, calib = 1) {
  const need = m.sizeGB + (m.mmprojGB || 0) + 0.8;
  const vram = hw.vramGB ? usableVram(hw) : 0;
  const ram = usableRam(hw);
  const readGB = m.activeGB || m.sizeGB; // weights read per word
  const bwG = gpuBandwidth(hw);
  let fit, tps;
  if (vram && need <= vram) { fit = 'gpu'; tps = (0.6 * bwG) / readGB; }
  else if (vram && need <= vram + ram) {
    fit = 'split';
    const gpuShare = Math.max(0, (vram - 0.8) / m.sizeGB);
    tps = 1 / ((readGB * gpuShare) / (0.6 * bwG) + (readGB * (1 - gpuShare)) / (0.6 * CPU_BANDWIDTH));
  } else if (need <= ram) { fit = 'cpu'; tps = (0.6 * CPU_BANDWIDTH) / readGB; }
  else return { fit: 'no', rating: 'wont', label: `Won't fit (needs about ${Math.ceil(need)} GB)`, tps: 0, need };
  tps *= calib;
  const rating = tps >= 25 ? 'great' : tps >= 10 ? 'good' : tps >= 4 ? 'ok' : 'slow';
  const label = { great: 'Fast', good: 'Smooth', ok: 'Usable', slow: 'Slow' }[rating];
  return { fit, rating, label, tps, wordsPerSec: tps * 0.75, need };
}

// What a PC needs to run a model: the smallest that can load it at all, and one that runs it
// smoothly, using common memory sizes. Also a smaller model that already fits, if there is one.
const RAM_SIZES = [8, 16, 24, 32, 48, 64, 96, 128, 192, 256, 384, 512];
const VRAM_SIZES = [6, 8, 12, 16, 24, 32, 48, 80, 96];
function requirements(m, hw, kind = 'text') {
  const est = (h) => (kind === 'text' ? estimateText(m, h) : estimateMedia(m, h));
  const base = { cpuThreads: hw?.cpuThreads || 8, unifiedMemory: false, gpuName: '' };
  // Minimum: no graphics card, just enough memory (slow but it works) — text models only.
  const minRam = kind === 'text' ? RAM_SIZES.find((r) => est({ ...base, ramGB: r, vramGB: 0 }).fit !== 'no') : null;
  // Smooth: the smallest graphics card that holds it entirely, with a normal amount of memory.
  let smooth = null;
  for (const v of VRAM_SIZES) {
    const ram = Math.max(16, RAM_SIZES.find((r) => r >= v) || 16);
    const e = est({ ...base, ramGB: ram, vramGB: v, vramFreeGB: v, gpuName: `${v} GB card` });
    if (e.fit === 'gpu') { smooth = { vramGB: v, ramGB: ram, est: e }; break; }
  }
  // Big models no single card holds: a Mac or PC with lots of shared (unified) memory.
  let unified = null;
  if (!smooth || smooth.vramGB >= 48) {
    for (const r of [32, 48, 64, 96, 128, 192, 256, 512]) {
      const e = est({ ...base, unifiedMemory: true, ramGB: r, vramGB: r * 0.75, vramFreeGB: r * 0.72, gpuName: 'unified' });
      if (e.fit === 'gpu') { unified = { ramGB: r, est: e }; break; }
    }
  }
  const minEst = minRam ? est({ ...base, ramGB: minRam, vramGB: 0 }) : null;
  return { need: kind === 'text' ? m.sizeGB + (m.mmprojGB || 0) + 0.8 : m.vramGB || m.sizeGB + 2, minRam, minEst, smooth, unified,
    haveRam: hw ? usableRam(hw) : null, haveVram: hw?.vramGB ? usableVram(hw) : 0 };
}
function smallerAlternative(m, hw) {
  const fam = familyOf(m);
  const fits = (x) => estimateText(x, hw).fit !== 'no';
  const same = live(TEXT_MODELS).filter((x) => x.id !== m.id && x.category !== 'large' && (familyOf(x) === fam || x.category === m.category) && x.sizeGB < m.sizeGB && fits(x));
  return same.sort((a, b) => (familyOf(b) === fam) - (familyOf(a) === fam) || (b.jobs?.general || 0) - (a.jobs?.general || 0))[0] || null;
}

// Speculative decoding: a tiny model from the same family (same tokenizer) guesses the next few
// words and the big model checks them all at once, which is often 1.5-2.5x faster with exactly
// the same answers. Mixture-of-experts models are already fast, so they don't use one.
const DRAFT_FAMILIES = [
  { targets: /^qwen3-(4b|8b|14b|32b)(-thinking)?(-uncensored)?$/, drafts: ['qwen3-1.7b', 'qwen3-vl-2b'] },
  { targets: /^llama-3\.(1-8b|3-70b)$/, drafts: ['llama-3.2-1b'] },
  { targets: /^qwen2\.5-(coder-)?(7b|14b|32b)$/, drafts: ['qwen2.5-coder-1.5b'] },
];
function draftFor(targetId, installed) {
  const target = TEXT_MODELS.find((m) => m.id === targetId);
  if (!target || target.activeGB) return null;
  const fam = DRAFT_FAMILIES.find((f) => f.targets.test(targetId));
  if (!fam) return null;
  for (const id of fam.drafts) {
    const d = TEXT_MODELS.find((m) => m.id === id);
    const inst = installed.find((m) => m.catalogId === id);
    if (d && inst && d.sizeGB <= target.sizeGB * 0.5) return inst;
  }
  return null;
}

// How an image/video model would run on this PC.
function estimateMedia(m, hw, calib = 1) {
  const vram = hw.vramGB ? usableVram(hw) : 0;
  const ram = usableRam(hw);
  const bwG = gpuBandwidth(hw);
  let fit, sec;
  if (vram && m.vramGB <= vram + 0.5) { fit = 'gpu'; sec = m.refSec * (400 / bwG); }
  else if (vram && m.sizeGB <= vram + ram) { fit = 'split'; sec = m.refSec * (400 / bwG) * 3; }
  else if (m.sizeGB + 2 <= ram) { fit = 'cpu'; sec = m.refSec * 30; }
  else return { fit: 'no', rating: 'wont', label: `Won't fit (needs about ${Math.ceil(m.sizeGB + 2)} GB)`, sec: 0 };
  sec *= calib;
  const per = m.kind === 'video' ? 900 : 60;
  const rating = sec <= per * 0.25 ? 'great' : sec <= per ? 'good' : sec <= per * 4 ? 'ok' : 'slow';
  const label = { great: 'Fast', good: 'Smooth', ok: 'Usable', slow: 'Slow' }[rating];
  return { fit, rating, label, sec };
}

// ---------- your installed models ----------
// Models you added yourself (or from LM Studio, Jan, Ollama…) aren't in the catalog. They are
// matched to a catalog model by name when possible, otherwise rated from their size.

const FAMILIES = ['gpt-oss', 'deepseek', 'hermes', 'dolphin', 'qwen', 'llama', 'phi', 'gemma', 'mistral', 'mixtral', 'granite', 'olmo', 'falcon', 'smollm', 'command', 'yi', 'glm', 'internlm', 'hermes', 'nemotron', 'exaone', 'kimi', 'minicpm'];
const words = (s) => String(s || '').toLowerCase().replace(/\.gguf$/, '').replace(/[^a-z0-9]+/g, ' ').replace(/([a-z])(\d)/g, '$1 $2').trim().split(/\s+/).filter(Boolean);

function matchCatalog(name) {
  const base = String(name).split('/').pop().replace(/\.gguf$/i, '').toLowerCase();
  const exact = TEXT_MODELS.find((m) => m.repo.split('/').pop().toLowerCase() === base);
  if (exact) return exact;
  const have = new Set(words(name));
  let best = null;
  for (const m of TEXT_MODELS) {
    const need = words(m.id);
    // Specialist words (coder, vl, thinking…) win a tie with the general model of the same size.
    const n = need.length + (need.some((w) => /^(coder|vl|thinking|reasoning|r1|distill|mini)$/.test(w)) ? 0.5 : 0);
    if (need.every((w) => have.has(w)) && (!best || n > best.n)) best = { m, n };
  }
  return best?.m || null;
}

function familyOf(m) {
  const s = `${m.catalogId || m.id} ${m.name}`.toLowerCase();
  return FAMILIES.find((f) => s.includes(f)) || words(m.name)[0] || m.id;
}

// inst: an installed model { id, name, catalogId?, size (bytes), vision?, files }
function profileInstalled(inst) {
  const sizeGB = (inst.size || 0) / 1e9;
  const vision = Boolean(inst.vision || inst.files?.mmproj);
  const c = TEXT_MODELS.find((m) => m.id === inst.catalogId) || matchCatalog(`${inst.name} ${inst.files?.model ? inst.files.model.split(/[\\/]/).pop() : ''}`);
  const open = /dolphin|hermes|abliterat|uncensored|unfiltered|nemo|mistral/i.test(`${inst.name} ${inst.files?.model || ''}`);
  if (c) return { ...c, id: inst.id, name: inst.name, catalogId: c.id, sizeGB: sizeGB || c.sizeGB, vision: vision || Boolean(c.vision), open: Boolean(c.open || open), known: true };
  // Unknown model: rate it by size (a 4-bit model is about 0.6 GB per billion parameters).
  const params = Math.max(0.5, sizeGB / 0.6);
  const base = Math.max(2, Math.min(8, Math.round(3 + 1.1 * Math.log2(params))));
  const coder = /coder|code/i.test(inst.name);
  const jobs = { general: base - (coder ? 2 : 0), office: base - (coder ? 2 : 0), research: base - (coder ? 2 : 0), coding: Math.min(9, base + (coder ? 2 : 0)), vision: vision ? base : 0 };
  return { id: inst.id, name: inst.name, maker: '', category: coder ? 'coding' : 'general', sizeGB, mmprojGB: 0, vision, open, reasoning: /think|r1|reason/i.test(inst.name), jobs, judge: Math.max(2, base - 1), known: false };
}

// ---------- Stack Advisor ----------
// A stack makes several models work as one: two or more answer independently (from different
// makers, so they make different mistakes), a lead compares them and writes the final answer,
// and a model that can see reads photos when nobody else in the stack can.
// The Effort setting in each chat decides how much of the stack runs (Quick uses one model).

// leadSpeed: how quick (tokens/s) the lead must be to count as fast enough; it answers every message.
function compose(pool, job, hw, calib, { vision = true, budget = 150, speed = 10, leadSpeed = Math.min(speed, 10), single = false } = {}) {
  // Models that always think at length only join stacks for reasoning and research.
  const thinkers = ['reasoning', 'research'].includes(job);
  const ranked = pool.map((m) => ({ m, est: estimateText(m, hw, calib) })).filter((x) => x.est.fit !== 'no' && (thinkers || !x.m.thinksLong));
  if (!ranked.length) return null;
  const quick = (x, target) => Math.sqrt(Math.min(1, x.est.tps / target));
  const byJob = [...ranked].sort((a, b) => scoreFor(b.m, job) * quick(b, speed) - scoreFor(a.m, job) * quick(a, speed) || a.m.sizeGB - b.m.sizeGB);
  const drafters = [];
  for (const x of byJob) {
    if (drafters.length >= (single ? 1 : 2)) break;
    if (drafters.some((d) => familyOf(d.m) === familyOf(x.m))) continue;
    if (drafters.length && scoreFor(x.m, job) < scoreFor(drafters[0].m, job) - 3) continue; // too weak to help
    drafters.push(x);
  }
  for (const x of byJob) { // only one maker available: a second model of the same family still helps
    if (single || drafters.length >= 2) break;
    if (!drafters.includes(x) && scoreFor(x.m, job) >= scoreFor(drafters[0].m, job) - 2) drafters.push(x);
  }
  const members = { drafters: drafters.map((x) => x.m.id) };
  if (drafters.length > 1) members.judge = [...ranked].sort((a, b) => b.m.judge * quick(b, leadSpeed) - a.m.judge * quick(a, leadSpeed))[0].m.id;
  const sees = (id) => ranked.find((x) => x.m.id === id)?.m.vision;
  if (vision && ![...members.drafters, members.judge].some(sees)) {
    const v = ranked.filter((x) => x.m.vision).sort((a, b) => scoreFor(b.m, 'vision') * quick(b, 15) - scoreFor(a.m, 'vision') * quick(a, 15))[0];
    if (v) members.vision = v.m.id;
  }
  const byId = (id) => ranked.find((x) => x.m.id === id);
  // Local models take turns, so the wait is the sum of the steps. Answers are longer for some
  // kinds of work (code, documents) than others (a chat reply).
  const words = JOBS[job]?.words || 400;
  const secFor = (id, n) => n / Math.max(0.1, byId(id).est.wordsPerSec);
  const total = () => (members.vision ? secFor(members.vision, 250) : 0) + members.drafters.reduce((t, d) => t + secFor(d, words), 0) + (members.judge ? secFor(members.judge, words * 1.1) : 0);
  // On a slow PC, drop the slowest extra drafter while the wait is too long (always keeping two
  // different models, or it stops being a stack).
  while (total() > budget && members.drafters.length > 1) {
    const drop = [...members.drafters].sort((a, b) => byId(a).est.tps - byId(b).est.tps)
      .find((d) => new Set([...members.drafters.filter((x) => x !== d), members.judge]).size >= 2);
    if (!drop) break;
    members.drafters = members.drafters.filter((d) => d !== drop);
  }
  const sec = total();
  const ids = [...new Set([members.vision, ...members.drafters, members.judge].filter(Boolean))];
  return {
    members, ids, secondsPerAnswer: sec,
    quality: Math.max(...ids.map((id) => scoreFor(byId(id).m, job))),
    estimates: Object.fromEntries(ids.map((id) => [id, byId(id).est])),
    downloadGB: ids.reduce((t, id) => t + byId(id).m.sizeGB + (byId(id).m.mmprojGB || 0), 0),
  };
}

// ---------- media kits (photo & video) ----------

const MEDIA_ROLES = {
  image: { label: 'Creates pictures', pick: (m) => m.category === 'image' },
  video: { label: 'Makes videos', pick: (m) => m.category === 'video' },
  edit: { label: 'Edits photos', pick: (m) => m.category === 'edit' },
  animate: { label: 'Brings photos to life', pick: (m) => m.category === 'video' && m.animate },
  helper: { label: 'Writes better prompts', text: true },
};
const RATE = { great: 1, good: 0.95, ok: 0.8, slow: 0.45 };

function composeMedia(job, hw, calib, mediaPool, textPool) {
  const members = {};
  const estimates = {};
  for (const role of JOBS[job].roles) {
    const r = MEDIA_ROLES[role];
    if (r.text) {
      // A small, quick text model is plenty for writing prompts; one that can see is a bonus.
      const t = textPool.map((m) => ({ m, est: estimateText(m, hw, calib) })).filter((x) => x.est.fit !== 'no')
        .sort((a, b) => (scoreFor(b.m, 'writing') + (b.m.vision ? 1 : 0)) * Math.sqrt(Math.min(1, b.est.tps / 25)) - (scoreFor(a.m, 'writing') + (a.m.vision ? 1 : 0)) * Math.sqrt(Math.min(1, a.est.tps / 25)))[0];
      if (t) { members[role] = t.m.id; estimates[t.m.id] = t.est; }
      continue;
    }
    const best = mediaPool.filter(r.pick).map((m) => ({ m, est: estimateMedia(m, hw, calib) })).filter((x) => x.est.fit !== 'no')
      .sort((a, b) => (b.m.quality || 5) * (RATE[b.est.rating] || 0.3) - (a.m.quality || 5) * (RATE[a.est.rating] || 0.3))[0];
    if (best) { members[role] = best.m.id; estimates[best.m.id] = best.est; }
  }
  const ids = [...new Set(Object.values(members))];
  const all = [...mediaPool, ...textPool];
  const main = JOBS[job].roles[0];
  return { members, ids, estimates, quality: members[main] ? (mediaPool.find((m) => m.id === members[main])?.quality || 5) : 0, complete: JOBS[job].roles.every((r) => members[r]), sizeGB: ids.reduce((t, id) => { const m = all.find((x) => x.id === id); return t + (m?.sizeGB || 0) + (m?.mmprojGB || 0); }, 0) };
}

// For a kind of work, two answers:
//  mine: the best stack from the models already on this PC (nothing to download)
//  best: the best stack this PC can run from the whole catalog
// ---------- accuracy level ----------
// A plain-words level from the expected quality (0-10). Stacks gain a little: several models
// answering and a lead that compares them catch more mistakes than one model alone. A cloud fact
// check or lead adds more.
function accuracyLevel(quality, { stack = false, cloud = false } = {}) {
  // Never 10/10: no AI is always right.
  const q = Math.min(9.6, (quality || 0) + (stack ? 0.5 : 0) + (cloud ? 1 : 0));
  const dots = Math.max(1, Math.min(5, Math.round(q / 2)));
  return { score: Math.round(q * 10) / 10, label: ['Basic', 'Fair', 'Good', 'High', 'Very high', 'Excellent'][dots], dots };
}

// ---------- cloud boost: which paid (or free) API makes each stack better, and how ----------
// mode 'hard': the private stack answers; only hard questions go to the cloud lead.
// mode 'check': the private stack answers; a cloud model fact-checks every answer (short reply).
// mode 'lead': the private stack drafts; the cloud model writes the final answer (best quality,
//              about the same paid use as the cloud alone, so it's for quality, not savings).
const CLOUD_BOOST = {
  general: { provider: 'google', alt: 'anthropic', mode: 'hard', share: 0.15, why: 'Hard or current-events questions get a frontier model; everyday ones stay private and free.' },
  fast: { provider: 'groq', alt: 'cerebras', mode: 'hard', share: 0.1, why: 'Groq and Cerebras answer in about a second, so hard questions stay fast too.' },
  reasoning: { provider: 'anthropic', alt: 'google', mode: 'hard', share: 0.4, why: 'Frontier models are far stronger at multi-step maths and logic; your stack handles the rest.' },
  office: { provider: 'anthropic', alt: 'google', mode: 'check', why: 'A second, independent model checks the figures and conclusions in every answer.' },
  research: { provider: 'google', alt: 'openrouter', mode: 'check', why: 'Gemini checks each claim against what it knows, flagging anything the sources don\'t support.' },
  writing: { provider: 'anthropic', alt: 'mistral', mode: 'lead', why: 'Your private models draft; Claude writes the final version in polished, natural prose.' },
  vision: { provider: 'google', alt: 'openai', mode: 'hard', share: 0.25, why: 'Gemini reads hard documents, handwriting and charts very accurately.' },
  open: { provider: 'openrouter', alt: 'xai', mode: 'hard', share: 0.2, why: 'OpenRouter has free uncensored community models, so hard requests get a bigger model with the same freedom.' },
  coding: { provider: 'anthropic', alt: 'github', mode: 'check', why: 'A frontier model reviews each answer for bugs and security issues before you run it.' },
  create: { provider: 'together', alt: 'openai', mode: 'image', why: 'For pictures beyond what this PC can make: FLUX Schnell is free on Together; OpenAI gpt-image-1 for the best results.' },
  edit: { provider: 'openai', alt: 'together', mode: 'image', why: 'gpt-image-1 makes precise edits from a description, at a cost per image.' },
};
// Estimated paid use compared with asking the cloud model directly for every answer.
// Output tokens cost about 4× input tokens, so input is counted at a quarter.
function cloudPlan(job, localQuality = 7) {
  const b = CLOUD_BOOST[job];
  if (!b) return null;
  const words = JOBS[job]?.words || 400;
  const out = words * 1.35; // tokens in a typical answer
  const prompt = 300; // tokens in a typical question with context
  const alone = out + prompt / 4;
  let paid = alone;
  if (b.mode === 'hard') paid = alone * b.share;
  if (b.mode === 'check') paid = 150 + (prompt + out) / 4; // reads the answer, writes a short verdict
  if (b.mode === 'lead') paid = out + (prompt + 2 * out) / 4; // reads the drafts too
  if (b.mode === 'image') paid = alone * 0.2; // only the pictures this PC can't make
  const saved = Math.round((1 - paid / alone) * 100);
  const after = b.mode === 'hard' ? localQuality * (1 - b.share) + 9.5 * b.share : b.mode === 'check' ? Math.max(localQuality, 8.5) + 0.5 : b.mode === 'lead' ? 9.5 : localQuality;
  return { ...b, saved, paidShare: Math.round((paid / alone) * 100), before: accuracyLevel(localQuality, { stack: true }), after: accuracyLevel(after, { stack: true }) };
}

function advise(job, hw, opts = {}) {
  const j = JOBS[job] || JOBS.general;
  const calib = opts.calib || 1;
  const installed = opts.installed || [];
  const text = installed.filter((m) => m.kind === 'text').map(profileInstalled);
  const base = { job, kind: j.kind, label: j.label };
  if (j.kind === 'media') {
    // Installed media models are catalog models (matched by catalogId); keep the installed id.
    const media = installed.filter((m) => m.kind !== 'text').map((m) => { const c = MEDIA_MODELS.find((x) => x.id === m.catalogId); return c ? { ...c, id: m.id, catalogId: c.id, name: m.name } : null; }).filter(Boolean);
    const mine = media.some((m) => MEDIA_ROLES[j.roles[0]].pick(m)) ? composeMedia(job, hw, calib, media, text) : null;
    // The prompt writer only needs a small model: reuse one you have, else a small download.
    const best = composeMedia(job, hw, calib, live(MEDIA_MODELS), text.length ? text : live(TEXT_MODELS).filter((m) => m.sizeGB <= 3.5));
    const haveCat = (id) => (media.find((m) => m.catalogId === id) || text.find((m) => m.catalogId === id))?.id || null;
    best.have = Object.fromEntries(best.ids.map((id) => [id, text.some((m) => m.id === id) ? id : haveCat(id)]));
    best.missingGB = best.ids.filter((id) => !best.have[id]).reduce((t, id) => { const m = MEDIA_MODELS.find((x) => x.id === id) || TEXT_MODELS.find((x) => x.id === id); return t + m.sizeGB + (m.mmprojGB || 0); }, 0);
    best.better = !mine || best.quality > mine.quality || (best.complete && !mine.complete);
    const yours = [...media.map((m) => ({ id: m.id, name: m.name, category: m.category, animate: Boolean(m.animate) })), ...text.map((m) => ({ id: m.id, name: m.name, category: 'text', vision: m.vision }))];
    return { ...base, roles: j.roles, roleLabels: Object.fromEntries(j.roles.map((r) => [r, MEDIA_ROLES[r].label])), yours, mine, best, cloud: cloudPlan(job) };
  }
  const vision = !['coding', 'reasoning', 'open'].includes(job);
  const tune = { vision, speed: j.speed, budget: j.budget, leadSpeed: Math.max(8, j.speed), single: Boolean(j.single) };
  const fits = (m) => !j.only || m[j.only]; // e.g. the Unfiltered stack only uses unfiltered models
  const pool = text.filter(fits);
  const mine = pool.length ? compose(pool, job, hw, calib, tune) : null;
  const best = compose(live(TEXT_MODELS).filter(fits), job, hw, calib, tune);
  const finish = (s) => {
    if (!s) return s;
    // Already installed? Use the installed copy instead of downloading again.
    s.have = Object.fromEntries(s.ids.map((id) => [id, text.find((m) => m.catalogId === id)?.id || null]));
    s.missingGB = s.ids.filter((id) => !s.have[id]).reduce((t, id) => { const m = TEXT_MODELS.find((x) => x.id === id); return t + m.sizeGB + (m.mmprojGB || 0); }, 0);
    s.accuracy = accuracyLevel(s.quality, { stack: s.members.drafters.length > 1 || Boolean(s.members.judge) });
    return s;
  };
  if (best) {
    finish(best);
    best.better = !mine || best.quality > mine.quality || (best.members.drafters.length > mine.members.drafters.length && best.quality >= mine.quality);
  }
  if (mine) mine.accuracy = accuracyLevel(mine.quality, { stack: mine.members.drafters.length > 1 || Boolean(mine.members.judge) });
  // Three ways to run it on this PC: quickest, balanced (the recommendation) and most accurate.
  const all = live(TEXT_MODELS).filter(fits);
  const tiers = {
    quick: finish(compose(all, job, hw, calib, { ...tune, single: true, speed: Math.max(25, j.speed), budget: Math.max(15, j.budget * 0.25) })),
    balanced: best,
    accurate: finish(compose(all, job, hw, calib, { ...tune, single: false, speed: 3, leadSpeed: 3, budget: j.budget * 4 })),
  };
  const same = (a, b) => a && b && JSON.stringify(a.members) === JSON.stringify(b.members);
  if (tiers.accurate && best && (same(tiers.accurate, best) || (tiers.accurate.quality <= best.quality && tiers.accurate.accuracy.score <= best.accuracy.score))) tiers.accurate = null;
  if (tiers.quick && best && same(tiers.quick, best)) tiers.quick = null;
  const cloud = cloudPlan(job, (mine || best)?.quality ?? 7);
  const yours = pool.map((m) => ({ id: m.id, name: m.name, known: m.known, vision: m.vision, score: scoreFor(m, job), judge: m.judge, sizeGB: m.sizeGB, est: estimateText(m, hw, calib) }));
  return {
    ...base, mode: j.mode, tiers, cloud,
    settings: { temperature: j.temperature, contextSize: j.contextSize, maxTokens: j.maxTokens, library: j.library, web: j.web },
    assistant: j.assistant,
    yours, mine, best,
  };
}

// ---------- low-cost upgrades ----------
// "What if this PC had…": re-runs the same estimates on upgraded hardware and reports the
// difference you'd notice. Prices are rough US ranges and change over time.
const UPGRADES = [
  { id: 'ram32', icon: '🧠', name: 'Memory (RAM) to 32 GB', cost: 'about $40–100',
    note: 'The easiest upgrade: most desktops and many laptops have a free or swappable slot. Match your PC\'s memory type (DDR4 or DDR5).',
    applies: (hw) => !hw.unifiedMemory && hw.ramGB < 30, apply: (hw) => ({ ...hw, ramGB: 32 }) },
  { id: 'ram64', icon: '🧠', name: 'Memory (RAM) to 64 GB', cost: 'about $80–180',
    note: 'Lets bigger "mixture-of-experts" models run from memory. Match your PC\'s memory type (DDR4 or DDR5).',
    applies: (hw) => !hw.unifiedMemory && hw.ramGB >= 30 && hw.ramGB < 60, apply: (hw) => ({ ...hw, ramGB: 64 }) },
  { id: 'gpu12', icon: '🎮', name: 'A 12 GB graphics card (for example a used RTX 3060 12 GB)', cost: 'about $200–280 used',
    note: 'Desktops only. Needs a free full-length (PCIe x16) slot and about a 550 W power supply.',
    applies: (hw) => !hw.unifiedMemory && (hw.vramGB || 0) < 11.5, apply: (hw) => ({ ...hw, vramGB: 12, vramFreeGB: 11.5, gpuName: '12 GB graphics card' }) },
  { id: 'gpu16', icon: '🎮', name: 'A 16 GB graphics card (for example RTX 4060 Ti 16 GB or Radeon RX 7600 XT)', cost: 'about $330–450',
    note: 'Desktops only. Fits most 14B models entirely on the card, the sweet spot for quality and speed.',
    applies: (hw) => !hw.unifiedMemory && (hw.vramGB || 0) < 15.5, apply: (hw) => ({ ...hw, vramGB: 16, vramFreeGB: 15.4, gpuName: '16 GB graphics card' }) },
  { id: 'gpu24', icon: '🚀', name: 'A 24 GB graphics card (for example a used RTX 3090)', cost: 'about $650–850 used', bigger: true,
    note: 'Not low-cost, but the biggest jump: 30B-class models fully on the card. Desktops only; needs a 750 W+ power supply.',
    applies: (hw) => !hw.unifiedMemory && (hw.vramGB || 0) < 23, apply: (hw) => ({ ...hw, vramGB: 24, vramFreeGB: 23.4, gpuName: '24 GB graphics card' }) },
];

function upgradeAdvice(hw, { calib = 1, installed = [] } = {}) {
  const sum = (a, job) => {
    if (!a) return null;
    const s = a.best;
    const mine = a.mine;
    const leadId = mine && (mine.members.judge || mine.members.drafters[0]);
    const lead = leadId && mine.estimates[leadId];
    return {
      stars: s ? starsFor(s.quality, s.ids.length >= 2) : null,
      names: s ? s.ids.map((id) => TEXT_MODELS.find((m) => m.id === id)?.name || id) : [],
      seconds: s?.secondsPerAnswer ?? null,
      chat: lead?.wordsPerSec ? JOBS[job].words / lead.wordsPerSec : null,
      mineStars: mine ? starsFor(mine.quality, mine.ids.length >= 2) : null,
    };
  };
  const look = (h) => ({ general: sum(advise('general', h, { calib, installed }), 'general'), coding: sum(advise('coding', h, { calib, installed }), 'coding') });
  const now = look(hw);
  const fastNow = new Set(TEXT_MODELS.filter((m) => ['great', 'good'].includes(estimateText(m, hw, calib).rating)).map((m) => m.id));
  const out = [];
  for (const u of UPGRADES) {
    if (!u.applies(hw)) continue;
    const h2 = u.apply(hw);
    const then = look(h2);
    const newlyFast = live(TEXT_MODELS).filter((m) => !fastNow.has(m.id) && ['great', 'good'].includes(estimateText(m, h2, calib).rating))
      .sort((a, b) => scoreFor(b, 'general') - scoreFor(a, 'general')).slice(0, 5).map((m) => m.name);
    const gain = (then.general.stars || 0) - (now.general.stars || 0) + (then.coding.stars || 0) - (now.coding.stars || 0)
      + (now.general.chat && then.general.chat ? Math.min(2, Math.log2(now.general.chat / then.general.chat)) : 0) + newlyFast.length * 0.15;
    out.push({ id: u.id, icon: u.icon, name: u.name, cost: u.cost, note: u.note, bigger: Boolean(u.bigger), now, then, newlyFast, gain: Math.round(gain * 100) / 100 });
  }
  // Best value first: the most noticeable difference among the low-cost ones.
  out.sort((a, b) => (a.bigger - b.bigger) || b.gain - a.gain);
  const top = out.find((u) => !u.bigger && u.gain > 0.3);
  if (top) top.bestValue = true;
  return out;
}

// ---------- summaries for Home and the Compare page ----------
// Stars (out of 5): the strongest member's score for the job, plus half a star when a second
// model cross-checks it. Rounded to the nearest half star.
const starsFor = (quality, team) => Math.min(5, Math.round((quality / 2 + (team ? 0.5 : 0)) * 2) / 2);

// What a set of text models can do, as plain capabilities.
function capabilities(profiles, { local = true } = {}) {
  const max = (f) => Math.max(0, ...profiles.map(f));
  return [
    { key: 'see', label: 'Sees photos & screenshots', on: profiles.some((m) => m.vision) },
    { key: 'reason', label: 'Step-by-step reasoning', on: profiles.some((m) => m.reasoning) || max((m) => scoreFor(m, 'reasoning')) >= 8 },
    { key: 'code', label: 'Writes & fixes code', on: max((m) => scoreFor(m, 'coding')) >= 7 },
    { key: 'long', label: 'Long documents', on: max((m) => m.ctx || 0) >= 65536 },
    { key: 'check', label: 'Cross-checks its answers', on: new Set(profiles.map((m) => m.id)).size >= 2 },
    { key: 'offline', label: 'Works offline', on: local },
  ];
}

// Newer models that replace older ones (old catalog id -> new). Only pairs where the new one is
// at least as good at the same job and similar in size; the online file can add more.
const SUCCESSORS = {
  'qwen2.5-3b': 'qwen3-4b', 'phi-3.5-mini': 'qwen3-4b', 'gemma-2-9b': 'gemma-3-12b',
  'qwen2.5-7b': 'qwen3-8b', 'mistral-7b': 'qwen3-8b', 'llama-3.1-8b': 'qwen3-8b',
  'qwen2.5-14b': 'qwen3-14b',
  'deepseek-r1-qwen-7b': 'deepseek-r1-qwen3-8b', 'deepseek-r1-qwen-14b': 'phi-4-reasoning-plus',
  'deepseek-r1-qwen-32b': 'qwen3-30b-a3b-thinking', 'qwq-32b': 'qwen3-30b-a3b-thinking',
  'qwen2.5-coder-32b': 'qwen3-coder-30b',
  'qwen2.5-vl-7b': 'qwen3-vl-8b',
};
// Featured picks per kind of work (best first). The online file can replace any list.
const FEATURED = {
  general: ['qwen3-30b-a3b', 'qwen3-14b', 'qwen3-8b', 'qwen3-4b'],
  coding: ['qwen3-coder-30b', 'qwen2.5-coder-14b', 'qwen2.5-coder-7b'],
  reasoning: ['qwen3-30b-a3b-thinking', 'phi-4-reasoning-plus', 'deepseek-r1-qwen3-8b'],
  vision: ['gemma-3-27b', 'qwen3-vl-8b', 'gemma-3-12b', 'qwen3-vl-4b'],
  open: ['qwen3-30b-a3b-uncensored', 'qwen3-14b-uncensored', 'qwen3-8b-uncensored', 'dolphin-3-mistral-24b', 'hermes-4-14b', 'rocinante-12b'],
};

// ---------- retired models ----------
// Beaten by newer models of the same size, so they're no longer offered or recommended. Installed
// copies keep working (and get an upgrade suggestion). Llama 3.2 1B stays as a hidden speed helper
// for Llama 3.1 8B / 3.3 70B.
const RETIRED = new Set(['llama-3.2-1b', 'phi-3.5-mini', 'qwen2.5-3b', 'mistral-7b', 'gemma-2-9b', 'sd15']);
for (const m of [...TEXT_MODELS, ...MEDIA_MODELS]) if (RETIRED.has(m.id)) m.retired = true;
const live = (list) => list.filter((m) => !m.retired);

// ---------- tested scores ----------
// Percent of questions answered correctly on four well-known tests:
//   math = AIME 2025 (competition maths), science = GPQA Diamond (expert science),
//   knowledge = MMLU-Pro (broad knowledge), coding = LiveCodeBench.
// Independent results from Artificial Analysis where they exist ("aa"), otherwise the maker's own
// ("maker"). null = not published. The online picks file can correct or add to these.
const SCORES = require('./scores.json');
// Uncensored versions are scored by the model they're made from (usually a point or two lower).
const SCORE_BASE = { 'qwen3-8b-uncensored': 'qwen3-8b', 'qwen3-14b-uncensored': 'qwen3-14b', 'qwen3-30b-a3b-uncensored': 'qwen3-30b-a3b' };

module.exports = { RETIRED, SCORES, SCORE_BASE, SUCCESSORS, FEATURED, TEXT_MODELS, TEXT_CATEGORIES, MEDIA_MODELS, MEDIA_CATEGORIES, JOBS, CLOUD_BOOST, cloudPlan, accuracyLevel, requirements, smallerAlternative, draftFor, DRAFT_FAMILIES, estimateText, estimateMedia, advise, compose, gpuBandwidth, profileInstalled, matchCatalog, scoreFor, familyOf, starsFor, capabilities, upgradeAdvice };
