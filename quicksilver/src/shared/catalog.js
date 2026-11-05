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
    blurb: 'The best all-rounder under 3 GB. Huge context window.', jobs: { general: 6, office: 6, research: 6, coding: 6, vision: 0, fast: 8 }, judge: 5 },

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
  { id: 'qwen3-30b-a3b', name: 'Qwen3 30B-A3B Instruct 2507', maker: 'Alibaba', params: '30B (3B active)', category: 'general', repo: 'unsloth/Qwen3-30B-A3B-Instruct-2507-GGUF', quant: 'Q4_K_M', sizeGB: 18.6, activeGB: 2.0, ctx: 262144,
    blurb: 'Big-model quality at small-model speed. One of the best local models.', jobs: { general: 9, office: 9, research: 9, coding: 8, vision: 0, fast: 6 }, judge: 9 },
  { id: 'qwen3-32b', name: 'Qwen3 32B', maker: 'Alibaba', params: '32B', category: 'general', repo: 'unsloth/Qwen3-32B-GGUF', quant: 'Q4_K_M', sizeGB: 19.8, ctx: 32768, reasoning: true,
    blurb: 'Dense heavyweight with deep reasoning. Needs a 24 GB card to be quick.', jobs: { general: 9, office: 9, research: 9, coding: 9, vision: 0, fast: 1 }, judge: 9 },

  // Reasoning
  { id: 'deepseek-r1-qwen-14b', name: 'DeepSeek R1 Distill 14B', maker: 'DeepSeek', params: '14B', category: 'reasoning', repo: 'unsloth/DeepSeek-R1-Distill-Qwen-14B-GGUF', quant: 'Q4_K_M', sizeGB: 9.0, ctx: 32768, reasoning: true,
    blurb: 'Works problems out step by step before answering. Great for maths and logic.', jobs: { general: 7, office: 7, research: 8, coding: 7, vision: 0, fast: 2 }, judge: 7 },
  { id: 'qwen3-30b-a3b-thinking', name: 'Qwen3 30B-A3B Thinking 2507', maker: 'Alibaba', params: '30B (3B active)', category: 'reasoning', repo: 'unsloth/Qwen3-30B-A3B-Thinking-2507-GGUF', quant: 'Q4_K_M', sizeGB: 18.6, activeGB: 2.0, ctx: 262144, reasoning: true,
    blurb: 'Deep, careful reasoning on hard analysis, still quick thanks to its design.', jobs: { general: 8, office: 9, research: 9, coding: 8, vision: 0, fast: 4 }, judge: 9 },
  { id: 'gpt-oss-120b', name: 'gpt-oss 120B', maker: 'OpenAI', params: '117B (5.1B active)', category: 'reasoning', repo: 'ggml-org/gpt-oss-120b-GGUF', quant: null, sizeGB: 63.4, activeGB: 3.5, ctx: 131072, reasoning: true,
    blurb: 'Near-frontier reasoning. For workstations with 64 GB+ of memory.', jobs: { general: 10, office: 10, research: 10, coding: 9, vision: 0, fast: 3 }, judge: 10 },
  { id: 'qwen3-235b-a22b', name: 'Qwen3 235B-A22B Instruct 2507', maker: 'Alibaba', params: '235B (22B active)', category: 'reasoning', repo: 'unsloth/Qwen3-235B-A22B-Instruct-2507-GGUF', quant: 'Q2_K_XL', sizeGB: 88, activeGB: 9, ctx: 262144,
    blurb: 'Flagship-class open model. Only for very high-memory machines.', jobs: { general: 10, office: 10, research: 10, coding: 10, vision: 0, fast: 1 }, judge: 10 },

  // Coding
  { id: 'qwen2.5-coder-7b', name: 'Qwen2.5 Coder 7B', maker: 'Alibaba', params: '7B', category: 'coding', repo: 'unsloth/Qwen2.5-Coder-7B-Instruct-GGUF', quant: 'Q4_K_M', sizeGB: 4.7, ctx: 32768,
    blurb: 'Writes, fixes and explains code in dozens of languages.', jobs: { general: 5, office: 5, research: 5, coding: 8, vision: 0, fast: 5 }, judge: 5 },
  { id: 'qwen2.5-coder-14b', name: 'Qwen2.5 Coder 14B', maker: 'Alibaba', params: '14B', category: 'coding', repo: 'unsloth/Qwen2.5-Coder-14B-Instruct-GGUF', quant: 'Q4_K_M', sizeGB: 9.0, ctx: 32768,
    blurb: 'Stronger coder for bigger projects and trickier bugs.', jobs: { general: 6, office: 6, research: 6, coding: 9, vision: 0, fast: 3 }, judge: 6 },
  { id: 'qwen3-coder-30b', name: 'Qwen3 Coder 30B-A3B', maker: 'Alibaba', params: '30B (3B active)', category: 'coding', repo: 'unsloth/Qwen3-Coder-30B-A3B-Instruct-GGUF', quant: 'Q4_K_M', sizeGB: 18.6, activeGB: 2.0, ctx: 262144,
    blurb: 'Top open coding model that still runs fast. Handles whole codebases.', jobs: { general: 7, office: 7, research: 7, coding: 10, vision: 0, fast: 5 }, judge: 8 },

  // Unfiltered: community models that follow your instructions with far fewer refusals.
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
];

const TEXT_CATEGORIES = {
  small: { label: 'Small & fast', icon: '⚡' },
  general: { label: 'General purpose', icon: '💬' },
  reasoning: { label: 'Reasoning', icon: '🧠' },
  coding: { label: 'Coding', icon: '💻' },
  vision: { label: 'Vision (photos & video)', icon: '👁️' },
  open: { label: 'Unfiltered', icon: '🔓' },
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
    blurb: 'The classic. Fast, light, endless styles. Good for older cards.', edit: 'img2img' },
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
    blurb: 'Short video clips from a description. Fits on 8 GB cards.' },
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
  general: { kind: 'text', label: 'Everyday', icon: '⚡', pitch: 'Quick, reliable answers for questions, advice and small tasks.', speed: 25, budget: 60, temperature: 0.7, contextSize: 16384, maxTokens: 4096, library: false, web: true, mode: 'blend',
    assistant: { name: 'Quicksilver', emoji: '💧', instructions: 'You are Quicksilver, a capable, honest assistant running privately on the user\'s computer. Give clear, direct, well-organised answers. Use Markdown (headings, lists, tables, code blocks) when it helps. If you are unsure, say so instead of guessing.' } },
  reasoning: { kind: 'text', label: 'Reasoning', icon: '🧠', pitch: 'Maths, logic, tricky questions and decisions, worked through step by step.', speed: 8, budget: 240, temperature: 0.3, contextSize: 32768, maxTokens: 8192, library: false, web: false, mode: 'debate',
    assistant: { name: 'Thinker', emoji: '🧠', instructions: 'You are a careful reasoner. Work through problems step by step, state your assumptions, check each step, and verify the final answer (recompute numbers, test edge cases, look for counter-examples). Give the conclusion clearly at the end. If the question is ambiguous, say how you interpreted it.' } },
  office: { kind: 'text', label: 'Complex tasks', icon: '🧩', pitch: 'Multi-step projects, analysis, spreadsheets and long documents.', speed: 10, budget: 180, temperature: 0.3, contextSize: 32768, maxTokens: 8192, library: true, web: true, mode: 'blend',
    assistant: { name: 'Analyst', emoji: '🧩', instructions: 'You handle complex, multi-step work. First make a short plan, then carry it out step by step, and finish with a clear result and next steps. With spreadsheets or data, work from the actual numbers: compute totals, changes and outliers carefully and show the figures in Markdown tables. Never invent numbers; if something is missing, say what is needed.' } },
  research: { kind: 'text', label: 'Research', icon: '🔎', pitch: 'Answers from the web and your files, with sources and fact checks.', speed: 10, budget: 150, temperature: 0.3, contextSize: 32768, maxTokens: 6144, library: true, web: true, mode: 'consensus',
    assistant: { name: 'Researcher', emoji: '🔎', instructions: 'You are a meticulous research assistant. Base answers on the reference excerpts and search results provided, cite them inline as [1], [2] matching their numbers, and say clearly when the sources do not answer the question. Separate facts from interpretation. End with a short summary.' } },
  writing: { kind: 'text', label: 'Writing', icon: '✍️', pitch: 'Emails, posts, letters and documents: drafted, rewritten and polished.', speed: 12, budget: 90, temperature: 0.7, contextSize: 16384, maxTokens: 4096, library: false, web: false, mode: 'blend',
    assistant: { name: 'Writer', emoji: '✍️', instructions: 'You are a skilled writer and editor. Match the tone the user asks for (or the tone of what they paste). Write clearly and concisely, in plain English, with no filler. When editing, keep the user\'s meaning and voice, and briefly list the main changes. For emails, include a subject line.' } },
  open: { kind: 'text', label: 'Unfiltered', icon: '🔓', pitch: 'Models that follow your instructions with far fewer refusals: fiction, mature themes, frank answers.', speed: 12, budget: 120, temperature: 0.8, contextSize: 16384, maxTokens: 4096, library: false, web: false, mode: 'blend', only: 'open',
    assistant: { name: 'Unfiltered', emoji: '🔓', instructions: 'You are a direct, candid assistant. Answer fully and frankly. Do not moralise, lecture or add disclaimers the user did not ask for, and do not water answers down. Follow the user\'s instructions on tone, style, persona and content, including for fiction and mature themes.' } },
  coding: { kind: 'text', label: 'App development', icon: '💻', pitch: 'Build apps and websites: plan, write, debug and review code.', speed: 10, budget: 180, temperature: 0.2, contextSize: 32768, maxTokens: 8192, library: false, web: false, mode: 'debate',
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
  if (job === 'reasoning') return Math.min(10, Math.round(((j.research ?? 5) + (m.judge ?? 5)) / 2) + (m.reasoning ? 2 : 0) - (m.category === 'coding' ? 1 : 0));
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
  const have = new Set(words(name));
  let best = null;
  for (const m of TEXT_MODELS) {
    const need = words(m.id);
    if (need.every((w) => have.has(w)) && (!best || need.length > best.n)) best = { m, n: need.length };
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

function compose(pool, job, hw, calib, { vision = true, budget = 150, speed = 10 } = {}) {
  const ranked = pool.map((m) => ({ m, est: estimateText(m, hw, calib) })).filter((x) => x.est.fit !== 'no');
  if (!ranked.length) return null;
  const quick = (x, target) => Math.sqrt(Math.min(1, x.est.tps / target));
  const byJob = [...ranked].sort((a, b) => scoreFor(b.m, job) * quick(b, speed) - scoreFor(a.m, job) * quick(a, speed) || a.m.sizeGB - b.m.sizeGB);
  const drafters = [];
  for (const x of byJob) {
    if (drafters.length >= 2) break;
    if (drafters.some((d) => familyOf(d.m) === familyOf(x.m))) continue;
    if (drafters.length && scoreFor(x.m, job) < scoreFor(drafters[0].m, job) - 3) continue; // too weak to help
    drafters.push(x);
  }
  for (const x of byJob) { // only one maker available: a second model of the same family still helps
    if (drafters.length >= 2) break;
    if (!drafters.includes(x) && scoreFor(x.m, job) >= scoreFor(drafters[0].m, job) - 2) drafters.push(x);
  }
  const members = { drafters: drafters.map((x) => x.m.id) };
  if (drafters.length > 1) members.judge = [...ranked].sort((a, b) => b.m.judge * quick(b, Math.min(speed, 10)) - a.m.judge * quick(a, Math.min(speed, 10)))[0].m.id;
  const sees = (id) => ranked.find((x) => x.m.id === id)?.m.vision;
  if (vision && ![...members.drafters, members.judge].some(sees)) {
    const v = ranked.filter((x) => x.m.vision).sort((a, b) => scoreFor(b.m, 'vision') * quick(b, 15) - scoreFor(a.m, 'vision') * quick(a, 15))[0];
    if (v) members.vision = v.m.id;
  }
  const byId = (id) => ranked.find((x) => x.m.id === id);
  // Local models take turns, so the wait is the sum of the steps.
  const secFor = (id, n) => n / Math.max(0.1, byId(id).est.wordsPerSec);
  const total = () => (members.vision ? secFor(members.vision, 250) : 0) + members.drafters.reduce((t, d) => t + secFor(d, 400), 0) + (members.judge ? secFor(members.judge, 450) : 0);
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
    const best = composeMedia(job, hw, calib, MEDIA_MODELS, text.length ? text : TEXT_MODELS.filter((m) => m.sizeGB <= 3.5));
    const haveCat = (id) => (media.find((m) => m.catalogId === id) || text.find((m) => m.catalogId === id))?.id || null;
    best.have = Object.fromEntries(best.ids.map((id) => [id, text.some((m) => m.id === id) ? id : haveCat(id)]));
    best.missingGB = best.ids.filter((id) => !best.have[id]).reduce((t, id) => { const m = MEDIA_MODELS.find((x) => x.id === id) || TEXT_MODELS.find((x) => x.id === id); return t + m.sizeGB + (m.mmprojGB || 0); }, 0);
    best.better = !mine || best.quality > mine.quality || (best.complete && !mine.complete);
    const yours = [...media.map((m) => ({ id: m.id, name: m.name, category: m.category, animate: Boolean(m.animate) })), ...text.map((m) => ({ id: m.id, name: m.name, category: 'text', vision: m.vision }))];
    return { ...base, roles: j.roles, roleLabels: Object.fromEntries(j.roles.map((r) => [r, MEDIA_ROLES[r].label])), yours, mine, best };
  }
  const vision = !['coding', 'reasoning', 'open'].includes(job);
  const tune = { vision, speed: j.speed, budget: j.budget };
  const fits = (m) => !j.only || m[j.only]; // e.g. the Unfiltered stack only uses unfiltered models
  const pool = text.filter(fits);
  const mine = pool.length ? compose(pool, job, hw, calib, tune) : null;
  const best = compose(TEXT_MODELS.filter(fits), job, hw, calib, tune);
  if (best) {
    // Already installed? Use the installed copy instead of downloading again.
    best.have = Object.fromEntries(best.ids.map((id) => [id, text.find((m) => m.catalogId === id)?.id || null]));
    best.missingGB = best.ids.filter((id) => !best.have[id]).reduce((t, id) => { const m = TEXT_MODELS.find((x) => x.id === id); return t + m.sizeGB + (m.mmprojGB || 0); }, 0);
    best.better = !mine || best.quality > mine.quality || (best.members.drafters.length > mine.members.drafters.length && best.quality >= mine.quality);
  }
  const yours = pool.map((m) => ({ id: m.id, name: m.name, known: m.known, vision: m.vision, score: scoreFor(m, job), judge: m.judge, sizeGB: m.sizeGB, est: estimateText(m, hw, calib) }));
  return {
    ...base, mode: j.mode,
    settings: { temperature: j.temperature, contextSize: j.contextSize, maxTokens: j.maxTokens, library: j.library, web: j.web },
    assistant: j.assistant,
    yours, mine, best,
  };
}

module.exports = { TEXT_MODELS, TEXT_CATEGORIES, MEDIA_MODELS, MEDIA_CATEGORIES, JOBS, estimateText, estimateMedia, advise, compose, gpuBandwidth, profileInstalled, matchCatalog, scoreFor, familyOf };
