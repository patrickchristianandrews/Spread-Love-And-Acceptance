# Open Studio

A free, standalone **image & text generation** desktop app (Windows). Its own installer, its own window — not part of Quicksilver.

## What it does

- **Free image engines, no account or key:**
  - **Pollinations** — fast, simple (Flux / Turbo).
  - **AI Horde** — a volunteer network with dozens of models (SDXL, Flux, anime…), with a live queue status.
- **Text generation:** free via Pollinations, or through a **free‑with‑key** cloud you connect (Groq, OpenRouter, Cerebras).
- **A secure, local key vault.** Any API key you add is **encrypted with the OS keychain and stored only on this PC**. Keys are used from inside the app's backend and are **never exposed to the page** — the thing a website cannot do safely.
- **A saved library** (kept on this PC), **batch** generation, **style presets**, and **"more like this"** variations.

## Planned next

Video, in‑painting edits and upscaling. These need either a paid media API or a bundled local engine, so they come after this image + text core.

## Build it yourself

```bash
cd open-studio
npm install
npm start        # run it
npm run dist     # build the Windows installer into dist/
```

Or use the **Open Studio installer** GitHub Actions workflow to build `Open-Studio-Setup-<version>.exe`.

## Privacy

Everything runs on your PC. The free engines are called directly; keyed clouds are called from the app's own backend so your key never leaves the machine. Your library and settings live in your user data folder only.
