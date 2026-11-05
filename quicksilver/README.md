# Quicksilver

**Forms to fit your work.**

Quicksilver is a private AI workstation for Windows. Like liquid quicksilver, it takes the shape of what holds it: your hardware, your files, your work. Free, open models run on your own PC, with no account and no key, and you can add cloud models (Claude, GPT, Gemini and others) wherever you want them.

## What it does

| | |
|---|---|
| 🧩 **Stacks** | Several models work as one. A vision model reads photos and video, two or more models from different makers draft answers independently, and a lead model checks the drafts, fixes mistakes and writes one final answer. Every answer shows how it was made. |
| 🧭 **Stack Advisor** | Pick a job (everyday, office & analysis, research, coding, photos & video, or fast on a modest PC). It reads your RAM, graphics card and video memory, then recommends Fast, Balanced and Powerhouse stacks with real speed estimates. One click downloads and builds the one you choose. |
| ✅ **Fact check** | A toggle in every chat. A second, *different* model checks the answer claim by claim against the same sources and files, marking each claim ✅ / ⚠️ / ❌ with corrections, an overall verdict and a confidence score. |
| 🎚️ **Effort** | Quick (one model, no thinking), Balanced (draft + review), Thorough (the full stack) or Max (full stack, longer answers, always fact checked). |
| 📊 **Office & analysis** | Attach Excel, CSV, Word, PDF and PowerPoint files. Spreadsheets are profiled (totals, means, ranges, top values) so models work from the real numbers. Any table in an answer saves to Excel or CSV in one click. |
| 📚 **Knowledge bases** | Separate, isolated collections of your data: files, folders and whole websites, plus live sources searched fresh for every question: PubMed, Europe PMC, ClinicalTrials.gov, Semantic Scholar, OpenAlex, Crossref, arXiv, Wikipedia, and any search page you add. Link knowledge bases to an assistant, optionally with "only answer from this knowledge". Answers cite sources as [1], [2]. |
| 🧑‍💼 **Assistants** | Ready-made helpers (Office Analyst, Researcher, Code Partner, Vision Analyst…), each with instructions, a model or stack, and default tools. Create your own. |
| 📷 **Photos & video in chat** | Attach photos, screenshots and videos (sampled into frames) for any vision model, or for a stack with a vision member. |
| 🎨 **Studio** | Create images (SD 1.5, SDXL, SDXL Turbo, FLUX), edit photos by instruction (FLUX Kontext, Qwen Image Edit), with a paint-the-area mask or by hand (crop, rotate, colour, looks, resize), create videos from text or a photo (Wan 2.1 / 2.2), and edit videos (trim, crop, speed, colour, fades, mute, reverse, MP4/WebM/GIF, frame grabs). |
| 📦 **Models** | 23 curated text and vision models by category, from 1 GB to 88 GB, plus 8 image and video models, each rated for your PC. Search all of Hugging Face and pick a size (quantization) that fits. Import any `.gguf`. |
| 🖥️ **Your PC** | Your hardware, and how every model will run on it (words per second, seconds per image), calibrated by a one-click speed test. |
| ☁️ **Cloud APIs** | Optional: Anthropic (Claude), OpenAI, Google Gemini, OpenRouter, Groq, Mistral, DeepSeek, xAI, Together, Ollama, LM Studio or any OpenAI-compatible endpoint. Mix them into stacks, for example local drafts with a cloud lead. |
| 🔌 **API server** | Quicksilver serves an OpenAI-compatible API on `127.0.0.1` (`/v1/models`, `/v1/chat/completions`, `/v1/images/generations`), so other apps can use your local models and stacks. An access key is optional. |

## Install on Windows

1. Download **Quicksilver-Windows-installer** from the latest run of the **Quicksilver Windows installer** workflow (repository → Actions), or from Releases.
2. Unzip it and run `Quicksilver-Setup-2.1.0.exe`. Until the installer is code-signed, Windows SmartScreen may warn you: choose **More info → Run anyway**.
3. Open Quicksilver, go to **Stacks**, pick a job and press **Download & build this stack**.

The installer includes the llama.cpp engine (text and vision, using Vulkan on NVIDIA, AMD and Intel cards, or the processor) and the stable-diffusion.cpp engine (images and video). On NVIDIA cards you can download the faster CUDA engines in **Settings → Engines**.

**Reliability:** built-in graphics chips (Intel UHD/Iris, AMD "Radeon Graphics") are skipped, since they cause most crashes. If a model fails on the graphics card, Quicksilver restarts it on the processor and retries automatically. Models start loading as soon as you open a chat, so the first reply comes quickly.

## Develop

```bash
cd quicksilver
npm install
npm run fetch-engines     # downloads llama.cpp and stable-diffusion.cpp for this platform into engine/
npm start
```

Tests use stand-in engines (`test/fakes`), so they run anywhere:

```bash
node test/backend.test.js          # every main-process module
xvfb-run -a node test/ui.test.js   # the real app, clicked through end to end
```

Build an installer with `npm run dist:win` (on Windows, after `npm run fetch-engines`).

## Layout

| Path | What's there |
|---|---|
| `src/main/main.js` | Window, IPC and the `qsmedia://` gallery protocol |
| `src/main/llama.js` | llama-server pool: loads models, chooses graphics card layers, falls back to the processor, streams chat |
| `src/main/complete.js` | Runs any target (local, cloud, stack) and the stack pipeline (vision → drafts → lead) |
| `src/main/models.js` | Installed models; Hugging Face search, file resolution and resumable downloads |
| `src/main/providers.js` | Cloud APIs (Anthropic SDK; OpenAI-compatible for the rest) and image APIs |
| `src/main/knowledge.js` | Knowledge bases: files, website crawler, BM25 search, live sources |
| `src/main/docs.js` | Reading PDF, Word, Excel/CSV (with profiling), PowerPoint, HTML, text and code |
| `src/main/media.js` | stable-diffusion.cpp (images, AI edits, video), ffmpeg video editing, gallery |
| `src/main/apiserver.js` | The OpenAI-compatible local API |
| `src/main/hardware.js`, `engines.js` | Hardware detection; engine builds (included and downloadable) |
| `src/shared/catalog.js` | Model catalog, jobs, Stack Advisor and speed estimates |
| `src/renderer/` | The interface (no framework): `js/core.js` shared helpers, one file per page |
| `scripts/fetch-engines.js` | Downloads the official engine builds that ship in the installer |

Your data lives in `%APPDATA%\Quicksilver`: models, chats, knowledge bases, gallery, settings. API keys are encrypted with Windows' own data protection.
