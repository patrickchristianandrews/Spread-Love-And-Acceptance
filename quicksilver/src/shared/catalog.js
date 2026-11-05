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

  // Vision (see photos, scans, charts and video frames)
  { id: 'gemma-3-4b', name: 'Gemma 3 4B (vision)', maker: 'Google', params: '4B', category: 'vision', repo: 'unsloth/gemma-3-4b-it-GGUF', quant: 'Q4_K_M', sizeGB: 2.5, mmprojGB: 0.8, vision: true, ctx: 131072,
    blurb: 'Sees photos, screenshots and documents. Small enough for most PCs.', jobs: { general: 6, office: 6, research: 5, coding: 4, vision: 7, fast: 7 }, judge: 4 },
  { id: 'qwen2.5-vl-7b', name: 'Qwen2.5 VL 7B (vision)', maker: 'Alibaba', params: '7B', category: 'vision', repo: 'unsloth/Qwen2.5-VL-7B-Instruct-GGUF', quant: 'Q4_K_M', sizeGB: 4.7, mmprojGB: 1.4, vision: true, ctx: 32768,
    blurb: 'Excellent at reading text, tables and charts in images.', jobs: { general: 6, office: 8, research: 7, coding: 5, vision: 9, fast: 4 }, judge: 5 },
  { id: 'gemma-3-12b', name: 'Gemma 3 12B (vision)', maker: 'Google', params: '12B', category: 'vision', repo: 'unsloth/gemma-3-12b-it-GGUF', quant: 'Q4_K_M', sizeGB: 7.3, mmprojGB: 0.9, vision: true, ctx: 131072,
    blurb: 'Strong all-rounder that also understands images well.', jobs: { general: 8, office: 8, research: 7, coding: 6, vision: 8, fast: 3 }, judge: 7 },
  { id: 'mistral-small-3.2', name: 'Mistral Small 3.2 24B (vision)', maker: 'Mistral AI', params: '24B', category: 'vision', repo: 'unsloth/Mistral-Small-3.2-24B-Instruct-2506-GGUF', quant: 'Q4_K_M', sizeGB: 14.3, mmprojGB: 0.9, vision: true, ctx: 131072,
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
  { id: 'sd15', name: 'Stable Diffusion 1.5', maker: 'Stability AI / RunwayML', kind: 'image', category: 'image', recipe: 'sd', sizeGB: 4.3, vramGB: 3, refSec: 4, defaults: { width: 512, height: 512, steps: 25, cfg: 7 },
    files: { model: { repo: 'stable-diffusion-v1-5/stable-diffusion-v1-5', match: '^v1-5-pruned-emaonly\\.safetensors$' } },
    blurb: 'The classic. Fast, light, endless styles. Good for older cards.', edit: 'img2img' },
  { id: 'sdxl-turbo', name: 'SDXL Turbo', maker: 'Stability AI', kind: 'image', category: 'image', recipe: 'sd', sizeGB: 6.9, vramGB: 6, refSec: 3, defaults: { width: 512, height: 512, steps: 4, cfg: 1 },
    files: { model: { repo: 'stabilityai/sdxl-turbo', match: '^sd_xl_turbo_1\\.0_fp16\\.safetensors$' } },
    blurb: 'Pictures in a few seconds. Great for quick ideas and drafts.', edit: 'img2img' },
  { id: 'sdxl', name: 'SDXL 1.0', maker: 'Stability AI', kind: 'image', category: 'image', recipe: 'sd', sizeGB: 7.1, vramGB: 8, refSec: 25, defaults: { width: 1024, height: 1024, steps: 30, cfg: 6 },
    files: { model: { repo: 'stabilityai/stable-diffusion-xl-base-1.0', match: '^sd_xl_base_1\\.0\\.safetensors$' }, vae: { repo: 'madebyollin/sdxl-vae-fp16-fix', match: '^sdxl_vae\\.safetensors$' } },
    blurb: 'High-resolution, detailed images with good composition.', edit: 'img2img' },
  { id: 'flux-schnell', name: 'FLUX.1 Schnell', maker: 'Black Forest Labs', kind: 'image', category: 'image', recipe: 'flux', sizeGB: 13.5, vramGB: 10, refSec: 20, defaults: { width: 1024, height: 1024, steps: 4, cfg: 1 },
    files: { diffusion: { repo: 'city96/FLUX.1-schnell-gguf', match: 'Q4_K_S\\.gguf$' }, ...FLUX_ENCODERS },
    blurb: 'State-of-the-art quality in 4 steps. Follows prompts closely and can write text in images.', edit: 'img2img' },
  { id: 'flux-kontext', name: 'FLUX.1 Kontext (photo editing)', maker: 'Black Forest Labs', kind: 'image', category: 'edit', recipe: 'kontext', sizeGB: 13.5, vramGB: 10, refSec: 60, defaults: { width: 1024, height: 1024, steps: 20, cfg: 1 },
    files: { diffusion: { repo: 'QuantStack/FLUX.1-Kontext-dev-GGUF', match: 'Q4_K_S\\.gguf$' }, ...FLUX_ENCODERS },
    blurb: 'Edit photos by describing the change: "make it sunset", "remove the person", "turn it into a watercolor".', edit: 'instruct' },
  { id: 'qwen-image-edit', name: 'Qwen Image Edit', maker: 'Alibaba', kind: 'image', category: 'edit', recipe: 'qwen-image', sizeGB: 20.5, vramGB: 16, refSec: 90, defaults: { width: 1024, height: 1024, steps: 20, cfg: 2.5 },
    files: { diffusion: { repo: 'QuantStack/Qwen-Image-Edit-GGUF', match: 'Q4_K_M\\.gguf$' }, vae: { repo: 'Comfy-Org/Qwen-Image_ComfyUI', match: 'qwen_image_vae\\.safetensors$' }, llm: { repo: 'unsloth/Qwen2.5-VL-7B-Instruct-GGUF', match: 'Q4_K_M\\.gguf$' } },
    blurb: 'Powerful instruction editing, including changing and adding text in images.', edit: 'instruct' },
  { id: 'wan2.1-1.3b', name: 'Wan 2.1 Text-to-Video 1.3B', maker: 'Alibaba', kind: 'video', category: 'video', recipe: 'wan', sizeGB: 7.0, vramGB: 8, refSec: 240, defaults: { width: 832, height: 480, steps: 20, cfg: 6, frames: 33, fps: 16 },
    files: { diffusion: { repo: 'Comfy-Org/Wan_2.1_ComfyUI_repackaged', match: 'wan2\\.1_t2v_1\\.3B_fp16\\.safetensors$' }, vae: { repo: 'Comfy-Org/Wan_2.1_ComfyUI_repackaged', match: 'wan_2\\.1_vae\\.safetensors$' }, t5xxl: { repo: 'city96/umt5-xxl-encoder-gguf', match: 'Q4_K_M\\.gguf$' } },
    blurb: 'Short video clips from a description. Fits on 8 GB cards.' },
  { id: 'wan2.2-5b', name: 'Wan 2.2 Text/Image-to-Video 5B', maker: 'Alibaba', kind: 'video', category: 'video', recipe: 'wan', sizeGB: 9.5, vramGB: 12, refSec: 420, defaults: { width: 1280, height: 704, steps: 20, cfg: 5, frames: 49, fps: 24 },
    files: { diffusion: { repo: 'QuantStack/Wan2.2-TI2V-5B-GGUF', match: 'Q4_K_M\\.gguf$' }, vae: { repo: 'Comfy-Org/Wan_2.2_ComfyUI_Repackaged', match: 'wan2\\.2_vae\\.safetensors$' }, t5xxl: { repo: 'city96/umt5-xxl-encoder-gguf', match: 'Q4_K_M\\.gguf$' } },
    blurb: 'Higher-quality 720p clips, from text or by animating a photo.', animate: true },
];

const MEDIA_CATEGORIES = {
  image: { label: 'Image generation', icon: '🎨' },
  edit: { label: 'Photo editing (AI)', icon: '🪄' },
  video: { label: 'Video generation', icon: '🎬' },
};

// ---------- jobs ----------

const JOBS = {
  general: { label: 'Everyday assistant', icon: '💬', pitch: 'Questions, advice, emails, plans and ideas.', temperature: 0.7, contextSize: 16384, maxTokens: 4096, library: false, web: true,
    assistant: { name: 'Quicksilver', emoji: '💧', instructions: 'You are Quicksilver, a capable, honest assistant running privately on the user\'s computer. Give clear, direct, well-organised answers. Use Markdown (headings, lists, tables, code blocks) when it helps. If you are unsure, say so instead of guessing.' } },
  office: { label: 'Office & analysis', icon: '📊', pitch: 'Spreadsheets, reports, data analysis, documents and email.', temperature: 0.3, contextSize: 32768, maxTokens: 6144, library: true, web: true,
    assistant: { name: 'Office Analyst', emoji: '📊', instructions: 'You are a senior business analyst. When given spreadsheets or data, work from the actual numbers: compute totals, averages, changes and outliers carefully and show the figures. Present results as clear Markdown tables and short bullet summaries with the key takeaway first. For documents and email, write in a crisp professional tone. Never invent numbers; if data is missing, say what is needed.' } },
  research: { label: 'Research & reference', icon: '🔎', pitch: 'Search your files and the web, summarise and cite sources.', temperature: 0.3, contextSize: 32768, maxTokens: 6144, library: true, web: true,
    assistant: { name: 'Researcher', emoji: '🔎', instructions: 'You are a meticulous research assistant. Base answers on the reference excerpts and search results provided, cite them inline as [1], [2] matching their numbers, and say clearly when the sources do not answer the question. Separate facts from interpretation. End with a short summary.' } },
  coding: { label: 'Coding', icon: '💻', pitch: 'Writing, fixing, reviewing and explaining code.', temperature: 0.2, contextSize: 32768, maxTokens: 8192, library: false, web: false,
    assistant: { name: 'Code Partner', emoji: '💻', instructions: 'You are an expert software engineer. Write correct, idiomatic, complete code in fenced code blocks with the language named. Explain briefly what changed and why. Point out bugs, edge cases and security issues. Ask a short clarifying question when a request is ambiguous.' } },
  vision: { label: 'Photos & video', icon: '📷', pitch: 'Understand photos, screenshots, scans, charts and video clips.', temperature: 0.4, contextSize: 16384, maxTokens: 4096, library: false, web: false,
    assistant: { name: 'Vision Analyst', emoji: '📷', instructions: 'You analyse images and video frames. Describe what matters for the user\'s question, read any text exactly, extract tables and chart values, and note anything unclear. For video, describe what happens over time using the frame timestamps.' } },
  fast: { label: 'Fast on a modest PC', icon: '⚡', pitch: 'Quick answers on laptops and older computers.', temperature: 0.6, contextSize: 8192, maxTokens: 2048, library: false, web: true,
    assistant: { name: 'Quick Helper', emoji: '⚡', instructions: 'You are a fast, concise assistant. Keep answers short and to the point unless asked for more.' } },
};

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

// ---------- Stack Advisor ----------
// A stack combines models: a vision model reads photos/video, two or more "drafters" answer
// independently, and a "lead" (judge) checks the drafts and writes one final, stronger answer.

// Ranks models for a job. Speed matters more or less depending on the tier: `speedTarget` is the
// writing speed (tokens/s) at which a model counts as fully fast enough.
function rankFor(job, hw, opts = {}) {
  const target = opts.speedTarget || 12;
  return TEXT_MODELS
    .map((m) => ({ m, est: estimateText(m, hw, opts.calib) }))
    .filter((x) => x.est.fit !== 'no' && (!opts.vision || x.m.vision))
    .map((x) => {
      const speed = Math.sqrt(Math.min(1, x.est.tps / target));
      return { ...x, score: (opts.judge ? x.m.judge : x.m.jobs[job]) * speed };
    })
    .sort((a, b) => b.score - a.score || a.m.sizeGB - b.m.sizeGB);
}

function family(m) { return m.id.split(/[-.]/)[0]; }

function advise(job, hw, opts = {}) {
  const j = JOBS[job];
  const calib = opts.calib || 1;
  const needsVision = job === 'vision' || job === 'office' || job === 'research';
  const best = rankFor(job, hw, { calib, speedTarget: 15 });
  if (!best.length) return { job, label: j.label, stacks: [] };

  const visionPick = (exclude = []) => rankFor('vision', hw, { calib, vision: true, speedTarget: 15 }).find((x) => !exclude.includes(x.m.id));
  const stacks = [];

  // Fast: one model, as quick as possible while still good at the job.
  const fastList = rankFor(job, hw, { calib, speedTarget: 40 });
  const fast = (job === 'vision' ? visionPick() : fastList[0]) || fastList[0];
  stacks.push({ tier: 'fast', name: 'Fast', blurb: 'One model. Quickest replies.', members: { drafters: [fast.m.id] } });

  // Balanced: a quick drafter, then a stronger lead reviews and improves it.
  const leads = rankFor(job, hw, { calib, judge: true, speedTarget: 10 });
  const lead = leads[0];
  const balancedLead = leads.find((x) => x.m.id !== fast.m.id);
  if (balancedLead) {
    const members = { drafters: [fast.m.id], judge: balancedLead.m.id };
    if (needsVision && !fast.m.vision && !balancedLead.m.vision) { const v = visionPick(); if (v) members.vision = v.m.id; }
    stacks.push({ tier: 'balanced', name: 'Balanced', blurb: 'A quick model drafts, a stronger model checks and improves it.', members });
  }

  // Powerhouse: two different model families draft independently, the best lead combines them.
  const drafters = [];
  for (const x of best) {
    if (drafters.length >= 2) break;
    if (drafters.some((d) => family(d) === family(x.m))) continue;
    drafters.push(x.m);
  }
  if (lead && drafters.length >= 2) {
    const members = { drafters: drafters.map((m) => m.id), judge: lead.m.id };
    if (needsVision && !drafters.some((m) => m.vision)) { const v = visionPick(); if (v) members.vision = v.m.id; }
    stacks.push({ tier: 'powerhouse', name: 'Powerhouse', blurb: 'Two models from different makers answer independently; the lead combines the best of both and fixes mistakes.', members });
  }

  for (const s of stacks) {
    const ids = [...new Set([s.members.vision, ...s.members.drafters, s.members.judge].filter(Boolean))];
    const models = ids.map((id) => TEXT_MODELS.find((m) => m.id === id));
    s.downloadGB = models.reduce((t, m) => t + m.sizeGB + (m.mmprojGB || 0), 0);
    // Each step runs one after another, so the wait is the sum of the steps.
    const secFor = (id, words) => { const e = estimateText(TEXT_MODELS.find((m) => m.id === id), hw, calib); return words / Math.max(0.1, e.wordsPerSec); };
    let sec = 0;
    if (s.members.vision) sec += secFor(s.members.vision, 250);
    for (const d of s.members.drafters) sec += secFor(d, 400);
    if (s.members.judge) sec += secFor(s.members.judge, 450);
    s.secondsPerAnswer = sec;
    s.estimates = Object.fromEntries(ids.map((id) => [id, estimateText(TEXT_MODELS.find((m) => m.id === id), hw, calib)]));
  }
  return {
    job, label: j.label,
    settings: { temperature: j.temperature, contextSize: j.contextSize, maxTokens: j.maxTokens, library: j.library, web: j.web },
    assistant: j.assistant,
    stacks,
  };
}

module.exports = { TEXT_MODELS, TEXT_CATEGORIES, MEDIA_MODELS, MEDIA_CATEGORIES, JOBS, estimateText, estimateMedia, advise, gpuBandwidth };
