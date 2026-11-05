# Quicksilver

*Private AI that takes any shape.*

Quicksilver is a desktop app for running free, open AI models on your own PC, in the spirit of Jan. There's no account and no API key, and your chats never leave your computer. On top of plain chat it adds characters, custom assistants, and a **Stack Advisor** that picks the best setup for what you want to do.

The name: quicksilver is the old name for mercury, the metal that is a liquid. It takes any shape, and so does your AI.

## Features

- **Runs locally.** Models run on your PC with llama.cpp. The app uses your graphics card when it can (Vulkan works on NVIDIA, AMD and Intel) and otherwise falls back to the processor.
- **Stack Advisor.** Choose a job: everyday assistant, coding, role-play and characters, creative writing, study and research, or fast on a modest PC. Quicksilver reads your RAM, graphics card and video memory, then ranks the models that fit. One click builds the stack: it downloads the model, tunes the settings for the job (temperature, context size, reply length), creates a matching assistant (for example "Code Partner" or "Tutor"), and makes it your default.
- **Model Hub.** Ten curated free models (Llama, Qwen, Qwen Coder, Gemma, Mistral Nemo, Phi) with download progress and cancel. You can also paste any Hugging Face GGUF link (`hf:user/repo:Q4_K_M`) or import a `.gguf` file you already have.
- **Chats.** Replies stream in as they're written. Code blocks have a Copy button, and Markdown is rendered. You can reroll a reply and flip between versions, continue a reply, edit or delete any message, stop midway, and pick the model for each chat.
- **Characters and assistants.** Role-play characters (with a personality, scenario, first message and memory for each chat) and instruction-following assistants. Characters import and export as `chara_card_v2` JSON.
- **Optional cloud.** Add an Anthropic API key in Settings to also chat with Claude. You never need one for local models.

## Install on Windows

Every push that changes `quicksilver/` builds the installer on GitHub Actions (workflow **Quicksilver Windows installer**):

1. Open the repository's **Actions** tab, select the latest **Quicksilver Windows installer** run, and download **Quicksilver-Windows-installer**.
2. Unzip it and run `Quicksilver-Setup-1.0.0.exe`. The installer isn't code-signed yet, so Windows SmartScreen may warn you: choose **More info → Run anyway**.
3. Open Quicksilver. It starts on the Stack Advisor: pick a job and press **Build this stack**.

To publish a proper download page, push a tag such as `quicksilver-v1.0.0`. The workflow then attaches the installer to a GitHub Release.

## Run from source

You need [Node.js](https://nodejs.org) 20 or newer.

```bash
cd quicksilver
npm install
npm start
```

To build an installer locally: `npm run dist:win` on Windows, `npm run dist:mac` on a Mac, or `npm run dist:linux`.

## Where things are stored

Everything lives in the app's data folder (`%APPDATA%\Quicksilver` on Windows):

- `models\`: downloaded models (open it from Model Hub → Open models folder)
- `models.json`: the list of installed models
- `quicksilver-data.json`: characters, assistants, chats and settings
- `quicksilver-key.bin`: the optional Anthropic key, encrypted with Windows' own protection

## How it's put together

| File | Role |
|---|---|
| `main.js` | Electron main process: window, saving, downloads, routing each chat to the local engine or to Claude |
| `engine.js` | Local engine: hardware detection, loading models, streaming replies, downloads (node-llama-cpp) |
| `catalog.js` | The Model Hub list, job scores and the Stack Advisor's sizing logic |
| `preload.js` | The only bridge from the page to the main process |
| `renderer/` | The interface (`index.html`, `styles.css`, `app.js`), no framework |
| `build/` | App icon (`icon.svg`, `icon.png`) |
| `test/` | `npm test` runs the interface in headless Chromium against a fake bridge (needs Playwright) |

The installer bundles the CPU and Vulkan engines. To add NVIDIA CUDA too (a little faster on NVIDIA cards, but about 570 MB more), remove the `!node_modules/@node-llama-cpp/*cuda*/**` line from `build.files` in `package.json`.
