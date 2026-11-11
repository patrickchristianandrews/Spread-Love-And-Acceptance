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
| 🎨 **Studio** | Create images (SD 1.5, SDXL, FLUX, Z-Image, Qwen-Image, and uncensored community models: Lustify, Chroma, Pony, Illustrious, CyberRealistic and more), edit photos by instruction (FLUX Kontext, Qwen Image Edit), with a paint-the-area mask or by hand (crop, rotate, colour, looks, resize), create videos from text or a photo (Wan 2.1 / 2.2, Wan 2.2 Turbo), and edit videos (trim, crop, speed, colour, fades, mute, reverse, MP4/WebM/GIF, frame grabs). |
| 📦 **Models** | 69 curated text and vision models by category, from 1 GB to 88 GB, plus 34 image and video models (including 20 uncensored picture models such as Lustify, Chroma, Pony and Illustrious), each rated for your PC. Search all of Hugging Face and pick a size (quantization) that fits. Import any `.gguf`. |
| 🖥️ **Your PC** | Your hardware, and how every model will run on it (words per second, seconds per image), calibrated by a one-click speed test. |
| ☁️ **Cloud APIs** | Optional: Anthropic (Claude), OpenAI, Google Gemini, OpenRouter, Groq, Mistral, DeepSeek, xAI, Together, Ollama, LM Studio or any OpenAI-compatible endpoint. Mix them into stacks, for example local drafts with a cloud lead. |
| 🔌 **API server** | Quicksilver serves an OpenAI-compatible API on `127.0.0.1` (`/v1/models`, `/v1/chat/completions`, `/v1/images/generations`), so other apps can use your local models and stacks. An access key is optional. |

## Install on Windows

Quicksilver comes as **Quicksilver Liquid Edition**: an uncensored set of models for chat (Qwen3.5 2B, 4B and 9B), pictures (Lustify), video (Wan 2.2) and search, about 30 GB in all. Quicksilver does not open until all of it is installed. There are three ways to get it, from the latest run of the **Quicksilver Windows installer** workflow (repository → Actions) or from Releases:

| Download | Size | What happens |
|---|---|---|
| **Full offline package** (`Quicksilver-Windows-installer`) | about 31 GB | The installer plus a "Quicksilver models" folder. Keep them together and run the installer: everything is copied in, nothing is downloaded. |
| **Installer alone** (`Quicksilver-Setup-x.y.z.exe`, on Releases) | about 1.9 GB | The small 2B model is inside; the setup screen downloads the rest on first launch. |
| **Web installer** (`Quicksilver-Windows-web-installer`) | about 200 MB | No models inside; the setup screen downloads the whole Liquid Edition on first launch. |

Until the installer is code-signed, Windows SmartScreen may warn you: choose **More info → Run anyway**. Quicksilver needs about 40 GB free on the drive you install to. The full package also needs room for the download itself (about 31 GB zipped and the same again unzipped; both can be deleted after installing). Build artifacts on the Actions page are kept for 90 days and need a GitHub sign-in.

The installer includes the llama.cpp engine (chat and vision, using Vulkan on NVIDIA, AMD and Intel cards, or the processor), the stable-diffusion.cpp engine (pictures and video) and whisper.cpp (voice typing). On NVIDIA cards you can download the faster CUDA engines in **Settings → Engines**.

The big models are kept outside the app's own folder, so updating or reinstalling does not download them again: in your data folder (`%APPDATA%\Quicksilver`), or, when you install on another drive, in a "Quicksilver kept models" folder beside the app on that drive. Uninstalling asks whether to remove your chats and models too.

**Reliability:** built-in graphics chips (Intel UHD/Iris, AMD "Radeon Graphics") are skipped, since they cause most crashes. If a model fails on the graphics card, Quicksilver restarts it on the processor and retries automatically. A model loads once and stays ready between messages.

## Develop

```bash
cd quicksilver
npm install
npm run fetch-engines     # downloads llama.cpp, stable-diffusion.cpp and whisper.cpp for this platform into engine/
npm start
```

Tests use stand-in engines (`test/fakes`), so they run anywhere:

```bash
node test/backend.test.js          # every main-process module
node test/media-catalog.test.js && node test/loading.test.js && node test/skills-auto.test.js && node test/pro.test.js
xvfb-run -a node test/ui.test.js   # the real app, clicked through end to end
xvfb-run -a node test/liquid-picture.test.js   # just ask: pictures in a Liquid Edition chat; Code chat
xvfb-run -a node test/in-use.test.js           # a stack uses only its own models; Models in use
xvfb-run -a node test/gate.test.js             # the setup screen; models kept across reinstalls
```

Build an installer with `npm run dist:win` (on Windows, after `npm run fetch-engines` and `node scripts/fetch-starter.js`, which downloads the Liquid Edition's models and writes `starter/STARTER.json`; without it the build has no Liquid Edition).

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
