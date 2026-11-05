# Quicksilver

*Characters that take any shape.*

Quicksilver is a private desktop app for chatting and role-playing with characters you create, powered by Claude. Quicksilver is the old name for mercury, the metal that is a liquid.

Everything stays on your computer: your characters, your chats, and your API key (encrypted with your system keychain). The only thing that leaves your machine is each message sent to the Claude API.

## Features

- **Character library**: cards with pictures, taglines and tags, plus search and tag filters.
- **Character creator**: name, picture, personality, scenario, first message and example dialogue. `{{char}}` and `{{user}}` placeholders are filled in for you.
- **Streaming chats**: *actions in asterisks* and "speech in quotes" are styled differently.
- **Reroll** a reply and flip between versions with ‹ ›, **Continue** a reply, **Edit** or **Delete** any message, and **Stop** a reply midway.
- **Chat memory**: notes for each chat that the character never forgets.
- **Your persona** and a **note for every chat** (for example "write in present tense").
- **Import and export** characters as JSON. Exports use the common `chara_card_v2` format, so cards made in other apps import too.
- Multiple chats per character, with recent chats in the sidebar.
- A choice of model (Claude Opus 5.5 by default, or Sonnet 5.5, Haiku 5.5 or Fable 5.1) and an effort level.

## Run it

You need [Node.js](https://nodejs.org) 20 or newer and an Anthropic API key from [console.anthropic.com](https://console.anthropic.com).

```bash
cd quicksilver
npm install
npm start
```

On first launch, paste your API key. You can also set the `ANTHROPIC_API_KEY` environment variable.

## Build an installer

```bash
npm run dist:win    # Windows .exe installer
npm run dist:mac    # macOS .dmg (build on a Mac)
npm run dist:linux  # Linux AppImage
```

Installers are written to `dist/`.

## How it's put together

| File | Role |
|---|---|
| `main.js` | Electron main process. Saves data to `quicksilver-data.json` in the app's user-data folder, keeps the encrypted key, and streams replies from Claude with the Anthropic SDK. |
| `preload.js` | The only bridge from the page to the main process. The page never sees the key and has no Node access. |
| `renderer/` | The interface (`index.html`, `styles.css`, `app.js`), with no frameworks. |
| `test/` | `npm test` runs the interface in headless Chromium against a fake bridge (needs Playwright). |

Replies use server-side fallback (`fallbacks: "default"`). If the chosen model declines a reply, the API retries it on Anthropic's recommended fallback model.
