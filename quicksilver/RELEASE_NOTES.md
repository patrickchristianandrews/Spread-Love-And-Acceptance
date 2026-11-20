### Download

**Quicksilver-Web-Setup-2.23.0.exe** (below, about 200 MB, with a matching `.sha256`) is the installer. It's small and quick to download. The first time Quicksilver opens, its setup screen downloads the whole Liquid Edition before the app starts — the three abliterated chat models (Qwen3.5 4B Brain, Gemma 3 12B Closer, Mistral Nemo 12B Muse), Lustify for pictures, Wan 2.2 for video, and the search models: about 38 GB in all — and the app opens once it's done. Keep about 45 GB free on the drive you install to. If the download stops, close and reopen Quicksilver and it picks up where it left off.

(A full offline package — the installer with all ~38 GB of models already beside it, so it needs no internet from the first minute — is built for tagged releases and lives as the **Quicksilver-Windows-installer** build artifact on those build runs, for anyone who wants to install with no download.)

Updating from 2.19 or 2.20: nothing extra to download; your chats, settings and models are kept.

Updating from 2.18: the Liquid Edition now includes its Closer and its picture and video makers, and Quicksilver does not open until all of them are installed. After the update the setup screen downloads what is missing (about 38 GB) before the app starts. Your chats, settings and the models you already have are kept.

### New in 2.23.0

- **🌤️ Weather comes back as a visual card, instantly.** Ask about the weather in any chat and Quicksilver shows a live forecast card — current conditions (temperature, "feels like", a sun/cloud/rain icon), a 24-hour strip, and a 7-day outlook with hi/lo temperature bars and rain chance. It reads from a real forecast (Open-Meteo, keyless) rather than letting the model guess, so the numbers and conditions are correct, and it shows °C or °F to match your country. A plain weather question skips the web search and the model entirely, so the card appears right away; if the live lookup fails it says so and asks for the city instead of making something up.
- **The web actually returns things in chat.** Ask to *see* pictures or videos from the web and they appear right under the answer — even on a small local model that used to only explain how to find them. Questions that genuinely need the live web (news, politics, prices, local events, "look it up", "search the web for…") are now searched and cited automatically, while everyday facts, creative writing, coding and maths stay instant and local.
- **One solid source for plain facts.** For universally-understood questions, Quicksilver pulls a single trusted Wikipedia summary instead of fanning out across many sites — faster and cleaner, with the source cited.
- **🦉 The Polymath** (Your Crew → Main). A cross-disciplinary thinker that connects economics, law, politics, history, science and philosophy, explains how society actually works in plain terms (markets, taxes, courts, rights, contracts), pulls live cited news, and steelmans every side rather than pushing one.
- **🤝 See the Other Side** (Your Crew → Main). Understand how someone across a political or belief divide actually thinks — explained from the inside, or in conversation with a thoughtful person who holds that view. Always the strongest, most charitable version; it never mocks a side, never implies you're wrong for your own views, and never tries to convert you.
- **Check any laptop before you buy.** The "models + your PC" buying calculator now includes the entry-level laptop graphics cards (RTX 4050 6 GB, RTX 5050 8 GB), so you can see exactly what a budget gaming laptop will run — words per second, picture time, whether local video is realistic, which Liquid Editions fit, and storage headroom — before spending a penny.

### New in 2.22.0

- **🔬 Microscope — look inside a model, token by token.** A new page (Explore → Microscope) runs a prompt on a local model greedily and shows every token it produced, how sure it was, and the alternatives it weighed — read from the model's own logprobs. Put **two models side by side** (for example two *quantizations* of the same model) and it aligns their outputs and shows **exactly where they first diverge**, token by token, with each one's probabilities at that step. All on your PC.

- **Reverse image search, built in.** A new **Reverse image** tab in Web Finder: paste a picture's web address and search it in one click across **Google Lens, Yandex, Bing Visual, TinEye, SauceNAO and Google Images** — find where a photo came from, who or where it is, or the same product cheaper. Includes clear guidance for searching a photo that's only on your PC.
- **"Open in Quicksilver" deep links.** Quicksilver now registers a `quicksilver://` link handler, so a model page or the Quicksilver site can open a model straight into the app: `quicksilver://model/<owner>/<repo>` jumps to adding that Hugging Face model (pick a quant and download), and `quicksilver://space/<owner>/<repo>` opens that Space's run panel — the same desktop‑app integration Hugging Face model pages use. Only those two owner/name shapes are accepted, so a crafted link can't drive the app anywhere unexpected.
- **Usage dashboard — see how you really use Quicksilver.** A new **Usage** page (Explore → Usage), worked out entirely from your own chats on this PC and sent nowhere: where your answers ran (**your models vs cloud AIs vs teams**, by count and by compute time), **how much touched the internet** vs stayed fully private, total time spent, pictures and videos made, the speed per kind, a per‑model table (answers, time, 👍/👎), an activity‑by‑day chart, and a **took‑vs‑should‑take** comparison (real time against Quicksilver's own estimate for each model on this PC).
- **Deep research — exactly what you're after, structured.** A new skill (⚡ or "do deep research on…", "find out exactly…"): it works out your real intent, plans the search, and actually uses the web and research tools across *several* queries — precise operators, authoritative sources, cross-checking facts — then structures the perfect answer: a direct answer up top, key findings by facet with citations, a comparison table when you're choosing between options, caveats and where sources disagree, a confidence level, a best pick, and a numbered source list. No first-page guesswork; it says so when the web can't confirm something.
- **Style & looks analysis from a selfie.** A new skill (⚡ or just ask with a photo attached): upload a clear selfie for a **blunt, honest** read — what's in the photo, body language, an estimated age range, face shape and a frank symmetry read, a genuine (un‑inflated) score out of 10 with the factors behind it, the highest‑impact changes first, how to look younger, hairstyles that suit your face shape, and beard/facial‑hair shaping — then it offers to **render before/after versions** on your own photo through the editing tools. Honest, not cruel: it targets what you can change and backs each critique with a fix, and it won't rate anyone who looks under 18.
- **Searchable dataset library for knowledge bases — add many at once.** The "🤗 Add a Hugging Face dataset" box is now a full **browser**: search and **sort by most‑downloaded, most‑liked, trending or recent**, **tick as many datasets as you want**, and add them all into one knowledge bank in a single go. Each is downloaded as a bounded, instantly‑usable, citable sample — and ingestion now **samples rows through the datasets server**, so even huge datasets (that used to be skipped for being too big) download a usable slice right away instead of failing.
- **Give a small model a huge library — FineWeb‑Edu web knowledge.** In Your knowledge, a new **📚 Add web knowledge** button pulls a bounded, high‑quality sample of **FineWeb‑Edu** (a clean educational‑web dataset) into a knowledge base — pick ~1,000 / ~5,000 / ~15,000 pages and a quality filter. Only the text kept is downloaded (never the terabyte‑sized whole), and your local models then **search it by meaning**, so even a small model can answer from a large reference library — and because it's semantic search, a misspelled, slangy or broken‑grammar question still finds the right pages. Every answer cites its sources.
- **Run Hugging Face Spaces inside Quicksilver.** A new **Spaces** page (Explore → Spaces) browses the thousands of free AI apps people host on Hugging Face — sort by most‑liked, trending or recently updated, or search (FLUX, Qwen image, WAN video, TTS…). Pick a Gradio one and **run it right here**: give a prompt (and an image if it edits or animates one) and the picture or video it makes lands in your gallery — nothing leaves the app except the call to the Space itself. Some Spaces need a free Hugging Face token or wait in a GPU queue, and non‑Gradio Spaces (Streamlit/Docker/static) are flagged as not runnable yet, with a clear reason.
- **Chat returns videos from the web.** Alongside pictures, the chat can now find and show **videos** from the web (a watch link and thumbnail for each), keyless by default — so "find me a video of…" just works.
- **Web Finder — find anything on the open web, the smart way.** A new page (Explore → Web Finder) with two halves. **Find:** tell it in plain words what you're after ("the cheapest place to buy a Sony A7IV", "exposed backup files on my site", "everything public about a username") and it builds the exact advanced-search queries — the "dork" operators (`site:`, `filetype:`, `intitle:`, `"exact phrase"`…) — ready to run in Google/Bing/DuckDuckGo/Yandex, copy, or hand to Quicksilver to run and summarise. 150+ templates in 16 categories: hidden & exposed files, secrets & credentials (for auditing your *own* sites), people & email, company & domain recon, **lowest prices & shopping**, pictures/video/music, logins, servers, errors, devices, social, URL parameters, and caches/archives. **Investigate:** a full OSINT knowledge base — the investigation process, ground rules, and start-from-one-clue playbooks (person, username, email, phone, domain, IP, photo/geolocation, social, company) — plus a directory of the free, open-source OSINT tools investigators use (Maltego, SpiderFoot, theHarvester, Sherlock/Maigret, Shodan, Have I Been Pwned, ExifTool, live ship/flight trackers like MarineTraffic and ADS-B Exchange, public webcam directories, handbooks and tool libraries). For lawful use only — research, auditing your own footprint, and authorised testing.

### New in 2.21.1

- **Benchmark a model — measured quality, not guesses.** A new **Benchmark** page (next to Compare models) runs any model or team on public tests with *checkable* answers — **GSM8K** (math), **IFEval** (instruction-following) and **HumanEval** (code) — and shows a real score out of 10, plus a leaderboard of the models you've tested. It grades the answers itself (a number match for math, instruction verifiers, and running the generated code against its unit tests), so you can see how your *local* models actually do, not just published cloud scores. The questions come free from Hugging Face at run time; a local model is free to test but slower, a cloud model uses a few calls. (Grading code needs Python installed; the other two don't.)

- **Strata is now a one-click local AI.** [Strata](https://strata-ai.gitbook.io/strata-ai) runs very large models (up to ~125B) on a single consumer GPU by streaming the weights from disk, and serves an OpenAI-compatible API on your PC. Connect it under **Your PC / local AIs** like Ollama or LM Studio — no key, nothing leaves the machine. Start Strata first (it listens on `localhost:8080`; change the port in Quicksilver if yours differs), then pick it as a provider. Because it's a local, free endpoint, the "prefer fast/free" routing treats it like your own models.
- **Cloud AIs now have their own page.** Connecting a cloud used to be a tab buried in **Models**, where the long provider list crowded out the models you run on this PC. It's now its own sidebar page, **Cloud AIs** — Models stays about the models on your PC, and the connections get room of their own.
- **Each connected cloud says whether it's working — and how to fix it if not.** Opening Cloud AIs quietly tests every connection; each card shows **✓ working** or **⚠ not working**, and a broken one spells out the cause (key rejected, address unreachable, 404, rate-limited…) with a direct fix (a "Get a fresh key" link, or Edit). A **Test** button re-checks any card on demand.
- **A plain guide to what free tiers actually give you**, right on the Cloud AIs page — roughly how far a free plan goes for text/chat, coding, images and video — plus a **Show: 🆓 Free (no card) · 🔑 No key at all · 🏆 Best free (generous + strong)** filter. The 🏆 set is only the services that pair a big free allowance **with** strong, high-rated models — Gemini, Groq, Cerebras, OpenRouter, NVIDIA, Mistral, ModelScope and GitHub Models — so you're not steered to a generous-but-weak one. Each 🏆 card shows a **quality score** and an **approximate free allowance** (e.g. "~1,000 req/day", "~1M tokens/day"), and the list is **sorted best-first**. Numbers are approximate and change, so each card links to the live limits. The keyless services (Pollinations, OVHcloud, LLM7) live under the 🔑 filter.
- **Connecting lists the service's models to pick from.** When you connect or edit a cloud, press **Load the live list** to pull every model it offers right now, then tick the ones to use (or add one by name) — no more guessing model IDs into a blank box.
- **More free clouds you can connect.** Added **Kilo Code**, **glhf.chat**, **OpenCode Zen**, **Agnes AI**, **Ollama Cloud**, **FreeInference** and **Scaleway (EU)** to the provider list — all OpenAI-compatible with free tiers (no card), from the community *awesome-free-llm-apis* directory. They join the ones already built in (NVIDIA, Cloudflare, Gemini, Groq, Cerebras, Mistral, Z.ai, Gonka, LLM7, OVHcloud, Cohere, SiliconFlow, ModelScope, Aion Labs, Chutes and more).

### New in 2.21.0

- **The Liquid Edition is now built from three different abliterated families, installed before you use it — no add‑ons to hunt down.** Instead of a stack of Qwen models, its crew now ships with just **one Qwen** — the **Qwen3.5 4B Brain** (Alibaba — answers, sees photos, thinks) — paired with a **Gemma 3 12B Closer** (Google — leads hard questions and writes, also sees photos) and a **Mistral Nemo 12B Muse** (Mistral — a vivid, uncensored storyteller that sketches fresh angles for creative work), alongside Lustify (pictures), Wan 2.2 (video) and the search models. All three chat models install during setup, before the app opens; on a PC that can't hold the 12B Closer and Muse next to the Brain they take turns on the bench (shown on the Liquid Edition card), but they're installed and ready. On a 16 GB+ graphics card you can still add suggested extras — a stronger Closer (Mistral Small 24B), a reasoner (gpt‑oss 20B) or another storyteller (Rocinante 12B) — but they're optional, not part of the core crew. The Max and Pro tiers span these families too.
- **A connected cloud AI is only used for a hard question when it actually helps.** Connecting a cloud used to send every hard question to it, even when it was no faster than your Liquid Edition. Now it goes to the cloud only when the cloud is clearly quicker on this PC or clearly stronger for that kind of question (or your PC is genuinely slow). A free cloud that's the same speed as your own models is left alone — the answer stays on this PC, just as fast, with nothing sent off the machine.
- **More cloud AIs to connect, and smarter free‑first routing.** Added **Abliteration** and **MegaNova** (a 100+‑model gateway) as one‑click cloud AIs, and **AI Horde** — free, crowdsourced, anonymous text generation that needs no account or key (it waits in a free volunteer queue). And with **Cloud AI for everything** on, Quicksilver now sends each kind of task (chat, coding, reasoning, writing, research) to the best cloud you've connected **for that task**, preferring ones that are **free** — so speed doesn't cost credits. A new **"Best connected AI for each task"** board (Explore → Best cloud AIs) shows which service handles each one.
- **The Liquid Editions page now shows example PCs for each level** (standard, Max, Pro): real graphics cards, memory and Mac equivalents, so you can see at a glance which one your computer can run.
- **Quicksilver (the Liquid Edition) is always your default again — a connected cloud AI never steals the top slot.** After connecting a free cloud AI, "Automatic" could show and default to that cloud model (e.g. `aion-labs-aion-3-0`) instead of your Liquid Edition. Now the Liquid Edition stack is always the default brain unless you pick another stack or on-PC model yourself; the cloud is still used automatically behind the scenes for hard questions and as rollover, it just isn't shown as your default. "Automatic" also names what it uses, e.g. "✨ Automatic · Quicksilver Liquid Edition".
- **A long chat with tools stays inside its memory.** When the AI has tools loaded (the GitHub connector, your own APIs, and so on), their definitions take up room in the model's context. A very long conversation could tip over the limit and fail with "request exceeds the available context size". Quicksilver now reserves room for the tool definitions when it trims the conversation, so a long chat with tools keeps working.

### New in 2.20.11

- **The model no longer reloads on every message.** On a PC with little spare memory, a chat used to outgrow the memory its model was loaded with after a few messages, and Quicksilver would stop the model and load it again from disk — so every message started slowly, "like it was the first time". The model is now loaded with a steady amount of conversation memory and the oldest turns are trimmed to fit, so the same model keeps answering as a chat grows. The read-ahead that runs when a chat opens no longer triggers a reload either. This also means a very large Conversation memory setting no longer tries to load more than a tight PC can hold.
- **Uncensored pictures work again (Venice "Invalid request parameters" fixed).** Venice had renamed its picture models, so asking for the old name returned a generic error. Quicksilver now checks Venice's live list of picture models, matches your choice to a current one, and sizes the picture to what that model accepts — and if something is still wrong, the error now says which setting Venice rejected.
- **Free cloud AIs roll over when one runs out of credit — not just when it's rate-limited.** "Free cloud AIs (rotating)" used to show Venice's "Insufficient USD or Diem balance" instead of moving on, because the check only recognised rate limits. Now out-of-balance, out-of-credit and payment errors all count as "this one's out," so it switches to the next free cloud AI — and when every free one is out, it answers on this PC instead of showing the error.
- **The model picker's "Automatic" now names your default stack** — it reads **"✨ Automatic · Quicksilver Liquid Edition"** (or whatever stack/model you set as default), so it's clear Automatic uses the Liquid Edition rather than looking like nothing is selected.
- **The Liquid Edition card shows the whole team.** Each model lists all the jobs it does on one line (so the Brain reads as "Answers · Sees photos · Thinks it through"), the Thinker and Muse now appear, and a model your PC can't keep loaded next to the Brain is shown on an "💤 On the bench · needs more memory to join" row instead of vanishing. When one model really is doing everything, the card says so and points to the suggested add-ons.

### New in 2.20.10

- **More free AI services to connect:** Aion Labs, Gonka Broker, LLM7.io (works with no key), ModelScope (Alibaba), OVHcloud AI Endpoints (EU, no sign-up) and SiliconFlow, plus Clarifai — each with a plain-language note on what it is and what its free tier gives. The API directory now lists 53 services.

### New in 2.20.9

- **A cloud AI that can't answer rolls over instead of erroring.** If a connected cloud AI fails before writing a word — out of credits, a bad key, no connection — Quicksilver switches to another connected cloud AI, then to your local models, instead of showing the error. For an uncensored chat it only rolls to another uncensored cloud or your PC. A credit/key failure is remembered for a few minutes so the dead service isn't retried every message. This applies everywhere that answers: chat, meme battle, GIF battle and the rest.
- **A failed picture falls back to the cloud.** When the on-PC picture model (Lustify) crashes or runs out of memory, a connected cloud service (Venice first for the Liquid Edition, also Pollinations, fal, Replicate, Stability) makes the picture instead — and is used first for the rest of the session.
- **Pictures default to the cloud when this PC would be slow.** If a cloud picture service is connected, pictures (and memes/GIFs) go to it unless this PC can make them in a reasonable time (Fast or Smooth). Photo editing and video stay on this PC.
- **Hybrid mode — keep API use to a minimum** (Settings → API connections): this PC first, the web next, a paid cloud AI last — only a genuinely hard question the web can't settle goes to the cloud.
- **Your own free GPU is used when it's connected.** Run a model on a free cloud GPU (Google Colab, Kaggle, Lightning AI) or a home/LAN server and connect it as a Custom OpenAI-compatible API; Quicksilver then uses it automatically for hard questions — before any paid cloud — because it costs nothing. The Guide explains the setup, and that your graphics card is used automatically.
- **Background tasks save your API.** Chat titles, follow-up suggestions and memory notes run on a model already loaded on this PC, so a connected cloud AI is spent only on the actual answers.
- **The Liquid Edition is always your default** unless you pick another model or stack yourself.
- **"Cloud AI for everything" covers the whole app** (chats, crew members and background tasks), and **Minds** — 22 characters and tools with their own voice, memory and file sharing — are in Your Crew. Safe search is a switch under Web search (off by default); answers start with the answer itself, no filler.
- **Clarifai** added to the API directory (free, OpenAI-compatible), now 47 services.
- **Updates download the app only** (about 200 MB) from the version after this one, keeping your models in place; click the download bar to see what's downloading. Time and speed show on every crew and Mind card.

### New in 2.20.8

- **Minds** (Your Crew → Minds): characters and experiences with a voice of their own — a 1940s private eye, a game master who runs a text adventure with dice, a brutal editor, a startup co-founder, a Socratic tutor, and more (22 built in). Each has its personality, an opening line it says first, example lines that set its voice, and its own memory: "remember that…" in its chat stays with that Mind. They run on any model or stack, on your PC or in the cloud. **How it works** shows every instruction behind a Mind — nothing hidden — and you can change any of it. **Create a Mind** from scratch or from a one-line idea (AI writes it), **share** one as a file, and **open** one a friend sent you.
  - **Makers:** Image Maker, Pixel Surgeon (photo retouching) and Prompt Builder.
  - **Code & security:** Reverse Engineer and Security Helper, for your own code and authorized, defensive work.
  - **Investigators** (public information only, never finding private people): Fact Checker, Website Investigator, Company Researcher and Image Detective.
  - Plus characters, games, coaches, thinkers, and a frank Sex Therapist for adults.
- **Updates download the app only, not your models.** An update now fetches the small web installer (about 200 MB) instead of the full 1.9 GB one. Your models are kept outside the app's folder, so they stay put; if a new version's Liquid Edition adds a model, only that one downloads. (From the update after this one — 2.20.8 itself still installs the full way, since your current version doesn't know about the smaller one yet.)
- **Click the download bar to see what's downloading:** each model listed with its own progress and a Pause button.
- **Safe search** (Settings → Web search): one switch, on by default, that goes into every web search the app makes — the AI's searches included — not just a switch on screen. Picture search always keeps safe search on.
- **Direct answers:** every answer starts with the answer itself — no "Certainly", no "As an AI", no "I hope this helps", no hedging. The usual chatbot filler is removed even with the human-writing style turned off.
- **Check your connections** (Settings → API connections): a button that sends a tiny request to each connected cloud AI and shows pass or fail, with how long it took. Your connected cloud AI also gets a quick warm-up when Quicksilver opens, so the first question isn't slow.
- **Documented provider settings used in full:** Venice's uncensored switches, and for Google Gemini the adjustable safety filters set to off. If a service rejects one of these, the request is sent again without it and says which service was the reason, instead of failing.
- **Fix:** connected models that reject a "temperature" setting (some newer Claude models) no longer error.

### New in 2.20.7

- **Giant models (optional, experimental),** under Your PC: run open models far bigger than your PC's memory (DeepSeek V4 Flash, Qwen3.8 Flash Next, GLM-5.2) with colibri, which keeps the busiest parts on the graphics card and streams the rest from the SSD. Quicksilver checks whether your PC is up to it and estimates each model's speed, downloads colibri from its official releases only when you ask (checking its published fingerprint), starts it, and its models appear in every model menu. Best for a hard question you can wait for; on a PC without a big graphics card it says it's too slow.

- **9 new skills:** a Growing businesses group (account outreach, account profiles, billable hours estimates, brand inspiration boards, brand reputation checks, competitive intelligence) and three for builders (Graphify: a knowledge graph of a codebase; a PHP web-shell exposure check; reverse engineering of apps you're authorized to examine). 253 skills in all.

- **Torrent downloads** (Your Crew → Downloads): paste a magnet link or a .torrent address, or pick a .torrent file, and it downloads into the folder you choose, with progress, speed, pause, resume and remove (removing keeps the files). Search covers free, legal collections: the Internet Archive's public-domain and openly licensed films, music, books and software. Unfinished downloads carry on when Quicksilver opens; sharing stops when a download finishes unless you choose to keep sharing.
- **Settings → API connections:** every cloud AI and service you connected in one place (edit, remove, connect another), and the switches for how they're used.
- **Settings → Writing style:** base style and tone (professional, friendly, candid, quirky, efficient, nerdy, cynical), warmth, enthusiasm, emoji, visual answers, and headers and lists.
- **Settings → Permissions:** by default the AI reads files in your folders and asks before changing anything; **Full access** (off unless you turn it on, with a warning) lets it reach any file and run commands without asking.

- **Models reload far less, and pick up where they left off.** On a PC short of memory, a chat's model used to restart every few messages as the chat grew, and the model you were chatting with could be unloaded to make room for a helper. Now models start with room for a longer chat, the one you're chatting with is unloaded last, and a **reading cache** saves what a model has already read before it's unloaded and puts it back when it loads again, so it doesn't re-read the whole chat (the slowest part on a PC without a graphics card). With Cloud AI for everything on, nothing is pre-loaded on your PC at all.
- **Built-in meta-search** (like SearXNG, nothing to set up): the free web search now asks DuckDuckGo, Mojeek and Wikipedia at once and merges the results, pages several engines found first.
- **Pictures from the web in chat:** ask "show me pictures of snow leopards" or "what does a pangolin look like" and real pictures appear under the answer, with where each came from and its license (click one for its page). Safe search is always on. **👁 Describe these** sends them to a model that sees. Uses Openverse (free), and your Brave or SearXNG search when set up.

- **Your connected cloud AI is really used now.** Before, connecting Venice (or any cloud AI) did nothing until you found and switched on "Cloud AI for hard questions". Now connecting one switches it on, and on a slower PC (where an everyday answer takes more than about 25 seconds) the new **Cloud AI for everything** too, so every message goes to it. Quicksilver says what it did, with one click to keep answers on your PC, and never changes it again once you've chosen (Settings). The Liquid Edition uses an uncensored one such as Venice first.
- **Your PC is the backup:** if the cloud AI can't answer (no credit, no connection, a refused key), this PC answers instead and says why.
- **Much funnier memes, from every model:** Meme battle now uses 20 real meme formats (Drake, Distracted Boyfriend, Two Buttons, Expanding Brain, Gru's Plan, Woman Yelling at Cat, This Is Fine and more), each with a note on how its joke works, so even a small model only has to fill in the boxes well. Each model brainstorms three jokes first and keeps the funniest, with tips on what makes a meme land (specific, relatable, a twist at the end, short). The real template pictures come from Imgflip's free list the first time and are kept on your PC, and saving a meme keeps its boxes.
- **GIF maker and GIF battle**, next to Meme battle (the sidebar now says Memes & GIFs): describe a GIF and it's made on your PC; a GIF battle turns both memes into GIFs, captions and all, before you vote; and any meme can be made into a GIF.

- **Build & ship plug-ins, built into every Liquid Edition** (on by default, nothing to install; switch any off under Connectors → Build & ship). Just ask:
  - **App tester** ("test my app at localhost:3000"): opens your app or site in a hidden browser, follows its links and reports JavaScript errors, failed requests, broken links and images, slow pages, layouts that spill off a phone screen and missing labels. It never clicks anything that could change data.
  - **Security audit** ("check my project for security holes before I ship"): looks through a project folder the way an attacker would: leaked keys, Supabase's service_role key in the browser, tables without row-level security, API routes with no login check, SQL and command injection, XSS, open CORS, weak password hashing, Firebase rules. Worst first, with how to fix each. Runs on your PC; nothing is uploaded.
  - **Design extractor** ("match the design of stripe.com"): reads a site's colors, fonts, type and spacing scales, corners, shadows, breakpoints and CSS variables as a DESIGN.md, so what the AI builds matches it.
  - **Up-to-date code docs** (Context7): current documentation for thousands of libraries, so code uses today's versions. Online only; only the library name and topic are sent.
- **Everyday and research plug-ins, built in too** (on by default, in every Liquid Edition; each is used only when a message needs it, so answers don't slow down): web search and page reader, calculator and unit converter (exact, nothing run as code), world time and days between dates, currency, stock and crypto prices, research papers (arXiv, PubMed, Hacker News), maps and driving distances (OpenStreetMap), dictionary and books (Open Library), public holidays, files on this PC (Documents, Desktop, Downloads; saving asks first) and website screenshots. Weather, translation, Wikipedia and PageSpeed are now on by default as well. 18 built-in plug-ins in all, none needing an account.
- **The Liquid Edition's free extras:** Playwright (a browser the AI can click through), Chrome DevTools, Excel, Word, PowerPoint, YouTube transcripts, Semgrep, Microsoft Learn docs and Cloudflare docs are added to every Liquid Edition and started only when a message needs one. Remove any under Connectors and it stays removed.
- **No more "needs Node.js" or "needs uv":** a plug-in that runs on Node.js or uv now works on any PC. The first time one is needed, Quicksilver downloads it from its official source, checks its published fingerprint and keeps it in its own folder (nothing is installed system-wide).
- **Buying a new computer, clearer:** every kind of computer now shows a desktop and a laptop with what each costs, and a new **Check any computer** calculator: pick the type, graphics card (40 desktop and laptop cards, or type the memory of another), memory and storage from a store listing, and see its tier and price range, how fast answers would be (and how that compares with this PC), picture and video times, which Liquid Editions it runs, the biggest models that run well on it, and whether the storage is enough.
- **Quicksilver is the app and its stacks, not a crew member:** everyday answers are now headed by the stack or model that answered (💧 Quicksilver Liquid Edition) instead of "Quicksilver · Quicksilver Liquid Edition", and the everyday crew member in Your Crew is now called Everyday Helper.
- **Fix:** with Venice connected, a picture your PC can't make (not enough memory) is now made by Venice instead of ending in an error, with a note saying so; for the rest of the session Venice goes first. A picture model that won't fit this PC at all goes to Venice straight away.
- **Fix:** picking an option on a page (such as a computer under Your PC) no longer jumps back to the top, and sections you opened stay open.
- **19 more ready-made plug-ins** under Connectors: Semgrep, Sentry, Firebase, Prisma, Neon, Heroku, Docker and Puppeteer (Build & ship); Windows control and phone control (Android and iPhone); DuckDuckGo, arXiv and YouTube transcripts (Research); Word and PowerPoint (Office); CoinGecko and Alpha Vantage (Money); Ableton Live and Godot (Creative). 59 in all, alongside Playwright, Supabase and Context7.

### New in 2.20.6

- **Liquid Edition Max, for a fast PC** (10–16 GB graphics card, 24–32 GB memory), between the Liquid Edition and Pro: Qwen3.5 9B (the Brain, reads photos and thinks), Qwen3 30B-A3B (the Closer: 30B knowledge at close to 3B speed), gpt-oss 20B (the Thinker) and Gemma 3 12B (the Muse), with Chroma1-HD and WAI-NSFW Illustrious for pictures. In Stacks, under The Liquid Editions; only installed if you choose it.
- **Every Liquid Edition chat model is abliterated** (its refusals removed from the weights), not just fine-tuned to be uncensored. Pro's Muse is now Gemma 3 12B abliterated, and the second-opinion offer is NeuralDaredevil 8B.
- **Only the current Liquid Edition models work together there:** when a Liquid Edition is corrected, a model that was on it and no longer belongs is taken off and switched off (under Models → Models in use) until you switch it on again. A message says which ones; nothing is deleted.
- **Fix:** a hard question to the Liquid Edition could end in an error ("System message must be at the beginning") when its thinking ran out of time, on slower PCs most of all. The instructions it adds are now placed where the Qwen3.5 models accept them.
- **Fix:** "What's new" under Check for updates stays open while you read it (it closed again each time the download moved on), shows the whole list in its own scroll area, and is still there once the update is downloaded.

### New in 2.20.5

- **Pictures on PCs without a graphics card:** before Lustify (or any picture model) starts, the chat models that aren't answering are unloaded when memory is short, so the picture model has room. This fixes "generate failed" on such PCs. They load again on your next message.
- **"☁️ Used …" under an answer** whenever a cloud AI answered or helped (a hard question handed off, a stack step, the Council, a picture made in the cloud).
- **Free rotation tells you when it switches:** a short message pops up when one free cloud AI hits its limit and the next takes over, and when all of them have.
- **The free rotation card counts every free service you connected** (Venice too), the same way the app picks them.

### New in 2.20.4

- **Models stop reloading after every message.** The chat title, follow-up suggestions and memory notes made after each answer now only use a model that is already loaded (or are skipped), so they never push your chat model out of memory. This mattered most on PCs without a graphics card.
- **Sort and filter any table from its column headers:** click a heading to sort; pick from a menu or type in the box under it to filter (models, trending, leaderboards, Compare models, Your PC and more).
- **Your Crew** (was Assistants), with a new **Debate** crew member at the top: it takes the other side and argues it fairly, scores the points, and can run a formal debate or argue both sides.
- **The Liquid Edition can use any cloud AI** you connect for hard questions (an uncensored one such as Venice is used first). The switch and the connect buttons are right on its card, and Venice is the suggestion.
- **Fixes:** a stack whose models aren't installed shows as "not set up" and a chat set to it answers with a model you have; Meme battle uses models on your PC by default, never two from one cloud service, and explains an empty cloud account; the "That answer took a while" tip appears at the top and no longer covers the message box.

### New in 2.20.3

- **Film studio:** two new stacks in Stacks → Video. One runs on your PC (a writer and director, a model that checks continuity, FLUX.3 Klein for storyboard frames, Wan 2.2 to animate them, voices, music and the video editor); the other uses a cloud video service you connect to animate shots with sound.
- **Film skills:** short film script, character & style bible (fixed descriptions so characters look the same in every shot), shot list with picture and motion prompts, storyboard frames, a film shot and a trailer plan. "Storyboard" now makes wide film frames; the comic skill keeps comics.
- **Imagination Studio** under Connectors → Creative & media: chat can drive it (pictures, video with sound, voices, songs, edits, whole films) on machines that run it.
- **New picture models:** Qwen-Image 2.1 Turbo (the best text in pictures, 8 steps) and FLUX.3 Klein (fast, sharp pictures on an 8 GB card, plus photo edits). Both licenses rule out commercial use. They need the latest picture engine.
- **Fixes:** big downloads no longer use the method that could crash the app partway through, and a background message no longer pushes the "Undo" button aside.

### New in 2.20.2

- **Better for your PC:** for each model you use, Quicksilver now looks across the whole catalog (any maker) for one that is at least a full point better at the same job and runs well on your PC, and offers it with "Switch to it". Uncensored is only replaced by uncensored, a model that reads photos only by one that does, and an untested model's rating is marked as an estimate. Never installed by itself.
- **Stacks keep up with new models:** the lists of models each stack chooses from are now refreshed every day from the catalog, so stacks can move to newer models from any well-known family (not only newer versions of the same model). You still get an "Update stack" notice first.

### New in 2.20.1

- **UncensoredLLM** under Connect an API: 171 uncensored, abliterated and role-play models with one key (paid, prepaid from $10), also in the API directory.
- **17 more uncensored models that run on your PC:** Cydonia, Dolphin Mistral 24B Venice Edition, Magnum Diamond, Magidonia, Mag Mell, UnslopNemo, NemoMix, Stheno, NeuralDaredevil, Skyfall, Amoral Gemma 3, DeepSeek R1 Qwen 32B Abliterated, Llama 3.3 70B Abliterated, Euryale, Anubis, Wayfarer, and DeepSeek V4 Pro Qwen3.5 9B Uncensored (DeepSeek-style thinking on an ordinary PC).
- **Meme battle:** two of your models each make a meme on a topic with their names hidden; vote for the funnier one, keep a leaderboard, save memes as pictures.
- **Coding agents on your models:** one click sets up OpenCode; settings to copy for Kilo Code, Cline, Roo Code, Continue and Aider; OpenHands through Docker. Quicksilver's local API now passes tool calls through, which these agents use to edit files and run commands.
- **Game development:** Godot, Unreal Engine 5 and Unity stacks, a game studio stack with a cloud lead, and 13 game skills (player controller, enemy AI, inventory, saves, menus, shaders, level design, dialogue, design documents, sprites, seamless textures and icons).
- **Fix:** "Change tone" no longer turns up for words like "cobblestone".

### New in 2.20

- **A much bigger model catalog:** 187 chat models (up from 69), found on Hugging Face every day. Old models are left out and newer versions replace them. The list comes inside the installer, so it is all there offline from the first start.
- **Trending and Featured are matched to your PC:** Trending lists only models that will run on it (a note names your PC and how many were hidden, with a button to show them), and ⭐ Featured only marks models that fit.
- **Hugging Face datasets as knowledge:** in Your knowledge, "Add a Hugging Face dataset" searches public collections of text and tables, shows each one's license and size first, then adds it so answers can cite it. After the download it stays on your PC.
- **Trending Spaces:** links to the apps people are using on Hugging Face right now, marked online and not private.
- **44 new specialist skills (225 in all):** two new groups, Law, policy & government and Security, privacy & audit, plus money (cash flow, reconciliation, financial statements), business (market sizing, decision memos, A/B tests), research (reading papers, source reliability, experiment protocols) and everyday life (questions for your doctor, sleep, hard conversations).
- **American spelling** throughout the app.

## What's inside

**Quicksilver Liquid Edition: the AI in the box. Uncensored, private, runs on your PC:**

- **Qwen3.5 4B, the Brain** (uncensored): answers everyday messages, reads photos, thinks hard questions through.
- **Qwen3.5 9B, the Closer** (uncensored): leads on hard questions on PCs with a graphics card; waits on the bench on smaller ones.
- **Qwen3.5 2B, the Muse** (uncensored): quick on any PC, sees photos, sketches ideas for creative work. Built into the installer.
- **Lustify**: uncensored pictures and photo edits.
- **Wan 2.2 5B and Wan 2.2 5B Turbo**: uncensored video from a description or from a photo (Turbo for 6 GB graphics cards).
- **Nomic Embed and the BGE reranker**: search your files and memories by meaning.
- **Whisper base**: voice typing, offline.
- **Engines:** llama.cpp (chat and vision), stable-diffusion.cpp (pictures and video), whisper.cpp (voice typing), FFmpeg (photo, video and audio tools).

The Liquid Edition is locked: it can't be edited or deleted and its models stay installed. You can chat with any other model or stack whenever you like.

**Everything it can do:**

- **Private by design** — answers offline; fully private / Proton-VPN private / online, shown on every chat; uncensored by default with an optional parental-lock PIN.
- **Smarter answers** — Automatic model choice, ~80 AI Teams, a Fusion builder with a model/API suggester, Double-check that corrects its own maths and facts, and learning from your 👍/👎.
- **Knows what you need** — Memory (Mem0-style, on by default, found by meaning), your Library (cited answers from your files and sites), and web search with no key.
- **Create** — pictures, video and music on your PC or in the cloud; **free with Pollinations (no key, no account)**, paid services for top quality, Venice for uncensored pictures, plus a GIF maker and video editing.
- **Gets things done** — Skills (find-a-product-from-a-photo, vibe-hacking, charts), Connectors (GitHub, Slack, Google…), CPA/CIA exam coaches, a document editor and projects.
- **Everyday** — voice typing and read-aloud, use from your phone, Compare models, a Your-PC advisor with upgrade costs, and automatic updates that keep your big models.

All of this is also listed in the app under **Settings → What's inside**.

## What's new in Quicksilver 2.19

The Liquid Edition release. Quicksilver now ships as one complete, uncensored set of models for chat, pictures and video, and behaves like any everyday AI: you just ask.

- **Quicksilver Liquid Edition, complete.** Chat (Qwen3.5 4B, 9B and 2B, uncensored), pictures (Lustify), video (Wan 2.2) and search, installed together. Quicksilver does not open until all of it is in place, so nothing is half set up. It is locked (it can't be edited or deleted), and you can still use any other model or stack.
- **Just ask.** Ask for a picture, a video, a photo edit, a song, a spoken version, a document, slides, a spreadsheet, a chart or an app and Quicksilver makes it. No skill to pick and nothing to type after "/". Follow-ups such as "another one, at night" keep going. Every skill is still in the / menu, and Settings → Chat has a switch if you prefer to choose skills yourself.
- **The chat decides what to make, and carries on.** The message box has one small choice: Auto (the default: it decides from your words), Answer, Picture or Video. Right after a picture, "make it snowy" or "add a hat" changes that very picture and "animate it" turns it into a video, with nothing attached or picked. A photo you attach with an instruction to change it is edited; a question about it is answered.
- **Create is now Gallery & tools.** What you made comes first, then the photo and video editing tools; the forms with every setting are still there. Pictures and videos are made by asking in a chat.
- **Pictures and video that finish.** One job at a time, a progress bar that only reaches 100% when the result exists, a second try with low-memory settings after a failure, and a plain reason when something does not work. A failed job stays on the page with "Try again".
- **Faster pictures and video in the Liquid Edition.** ⚡ Fast mode paints a Lustify picture in 8 steps instead of 30 (about a seventh of the work), used by itself on PCs where a picture would take long and a tick in the picture form everywhere else. Wan 2.2 clips made from a description use a quick decoder on graphics cards under 16 GB. Both were tried on the real engines by the build before being switched on, and a try that fails with them is repeated the plain way.
- **On this PC: what to expect.** While you build a custom AI, edit a team or look at a model, a forecast for this computer: where each model runs and how fast, whether they fit together, how long the first and later answers take, what is loaded now, what happens to pictures and video, and the disk space a download needs, with one verdict in plain words.
- **API suggestions for what you built.** Every stack and custom AI, and every build in progress, shows the APIs that would add the most to it: the best free one, the best whatever it costs and one you already have, with what each lifts and what it costs. Connect in one click (a build in progress comes back afterwards).
- **API directory.** All 45 cloud services in one list, by task, free ones first, with what the free plan gives you, what it costs after and a link to each (Guide, Connect an API, and API-DIRECTORY.md).
- **Clearer pages.** Stacks & Fusion shows your stacks first; Models has its tabs at the top with storage and the models in use first.
- **Mobile app developer stacks.** Two ready-made teams for building phone apps (iPhone, Android, Flutter, React Native): one that runs entirely on your PC (a coder, a planner that traces crashes, and a model that reads your mockups and screenshots), and one where a cloud AI you connect leads.
- **Code chat.** A second button under New chat opens a chat set up for programming: complete code you can copy and run, short explanations, root cause first on bugs. New chat stays the everyday AI. In a Code chat (and for any message about code) nothing is turned into a picture or a document; a web page or app you ask for opens in a preview.
- **A way back when it guesses wrong.** An answer made with a skill Quicksilver chose by itself has an "Answer normally" button, "No thanks" on a suggested skill now really dismisses it, and editing a message re-reads it.
- **A stack uses its own models and nothing else.** Models found in other apps (LM Studio, Ollama, Jan, Downloads) are never added or used by themselves. Models → On this PC has a new **Models in use** list: tick a model to let Quicksilver use it by itself (Automatic, double-checking, the Council, and as a helper in the Liquid Edition when it is uncensored).
- **Only real chat models are listed.** Video and picture model files, text encoders and search models are no longer mistaken for chat models, and second copies of a model you already have are skipped. Entries like that from an older version are cleaned up (no file is deleted).
- **Liquid Edition Pro** for powerful PCs (16 GB+ graphics card): bigger uncensored models for chat and pictures. It is at the top of Stacks and is only installed if you choose it.
- **Suggested add-ons**: six optional uncensored models (anime pictures, the highest-quality pictures, low-memory pictures, stories and role-play, a stronger Closer, a strong reasoner). Never downloaded by themselves.
- **Many more uncensored models** in the catalog: about 20 picture models (Chroma, Pony, Illustrious, NoobAI, CyberRealistic and others), Wan 2.2 Turbo for video, and more chat models.
- **Models stay loaded.** A model loads once and stays ready between messages and chats (Settings → Chat → Keep models loaded), a busy model is never reloaded, and two requests for the same model share one load.
- **Create: pictures, video and music** in the Setup Advisor, with one goal for each popular kind of making, including complete songs.
- **Three ways to install**: the installer, the full offline package, and a small web installer. The big models are kept outside the app's own folder (in your data folder, or beside the app when it is installed on another drive), so updating or reinstalling does not download them again. Uninstalling asks whether to remove your chats and models too.
- **Double-check stays on your PC.** Checking an answer is only sent to a cloud AI when the answer came from the cloud, when you chose that checker yourself, or when "Cloud AI for hard questions" is on.
- **Venice, in numbers.** Where Venice is suggested for the Liquid Edition, Quicksilver says how much less of it you would use, how much sooner hard answers arrive on your PC and how the quality compares.
- **Private online says what it is doing.** When Private online is on and no VPN is connected, a bar at the top says so and offers one click to connect or to go online without it, instead of updates and downloads failing with an error.
- **Tidier chat box**: all the options on one line, a plain Online/Offline switch, and a clearer Effort control.
- **Voice typing works offline from the first run**: its speech model ships with the Liquid Edition.
- **Fixes from a full review of the app**: safer downloads (stalled connections are retried, a full disk fails cleanly), safer local API (other websites can't call it unless you set a key), picture and video jobs stop when Quicksilver closes, PDF export of long answers, and many smaller ones.

## What's new in Quicksilver 2.18

A big release focused on accuracy and speed, plus exam coaches, a GIF maker and a vibe-hacking team. In short: answers now check and correct their own maths, code and facts; the app does more for you automatically (web, your apps, your documents); and it's noticeably quicker through reading ahead, instant repeats and better use of your hardware.

- **Sounds like a person, not a chatbot.** Quicksilver talks the way people do and writes clean, natural text you can send as your own. No "Certainly!" or "Great question!", no "I hope this helps" sign-offs, no em dashes everywhere, and headings or bullet points only when they genuinely help. Anything that slips through is tidied before you see it (code is never touched). Prefer the structured AI style? Switch it off in Settings → General.
- **Private, protected or online: your choice, shown as a picture.** Fully private (offline), Private online through Proton VPN (free plan, or sign in to your Proton account for more), or Online. Every chat says whether its session is private or protected, including cloud AI sent through the VPN.
- **The built-in model reasons step by step** on hard questions, is uncensored (the parental lock keeps it family-safe), and Quicksilver keeps its team the best fast pick for your PC, adding better models as they come out.
- **Better models and stacks arrive by themselves**, with a notice and one-click (or automatic) install, then swap into your stacks and chats. "Maybe later" reminds you again in a few days.
- **Much quicker Double-check**, **Quick or Detailed answers**, **spell check** in the message box, a labeled **Fix my prompt** button, **stop a running model** to free memory, and a **next best model** offer when memory runs low.

- **Parental lock.** Set a PIN (Settings → General) to put uncensored AI — the community "unfiltered" models and teams — behind it. Everything else stays open. Using one of those models or teams then asks for the PIN, which is needed again each time Quicksilver reopens. The PIN is stored only as a scrambled hash, never in plain text.
- **Connect a cloud AI right from the message box.** A **＋ Cloud AI** option in the chat bar (and under ＋ in the simple view) takes you straight to connecting ChatGPT, Claude, Gemini and others, to use alongside your local models.
- **Flash attention** in the engine: faster responses and less memory used, so your models stay loaded instead of reloading between questions (turned on automatically where it's known to be safe).

- **Answers correct themselves.** When Double-check is on and the second model finds a clear mistake, the answer is rewritten once with the correction (marked "✓ Corrected"; the first answer is still there with ‹ ›). A **Fix it** button in the check panel does the same on demand. Turn the automatic fix off in Settings → General.
- **👍 / 👎 on every answer.** Your votes teach Automatic which model does best for you on each kind of question (code, writing, working things out…).
- **Checks the web by itself** for questions about current things (news, prices, weather, the latest guidance), and says so. If search engines are blocked on your network, Wikipedia is used as a backup.
- **Faster on PCs without a graphics card.** Helper models that are much weaker than the lead are skipped, and the small starter model now speeds up the main one (same answers, less waiting).
- **Follow-up questions start sooner.** The model keeps the conversation it has already read in memory and only reads your new message, instead of re-reading the whole chat each time. Long chats trim old messages in blocks so this keeps working.
- **Faster web answers.** Only the parts of each page that match your question are read (about a third as much text), slow pages are skipped after a few seconds, and the model loads while the search runs.
- **Your next question goes first.** Suggestions, chat titles and memory notes running in the background stop the moment you ask something.
- **Big "mixture of experts" models on small graphics cards** (like Qwen3 30B-A3B) keep their shared parts on the card and only the extra experts in normal memory: often 2–3× faster.
- **GIF maker.** A new team and skill (type /gif): describe it and get a looping GIF made on your PC. Any video you make in chat also has a 🌀 GIF button.
- **Vibe hacking team.** A new team in AI Teams → Coding: turn a rough idea or a vibe into a working app on the spot, then keep riffing on it ("make it neon", "add a scoreboard"). It builds runnable single-file apps that run entirely on your PC, pairing a creative lead with a strong local coder.
- **CPA and CIA exam coaches.** Two new assistants work like a review course, following the official AICPA CPA Exam Blueprints (AUD, FAR, REG, BAR, ISC, TCP) and the IIA CIA syllabus (Parts 1–3): short lessons, interactive practice questions (pick an answer, see why it's right and why yours was wrong), CPA task-based simulations, a week-by-week study plan, and a dashboard of your score per section with one click to drill your weak spots. Answers are double-checked and every calculation audited. Add your own course books to the Library and they're used and cited.
- **Uses everything you've set up, by itself.** Mention an app you've connected (GitHub, Slack, your calendar…) and it's used for that message. If your Library clearly has the answer, it's searched and cited (📚). Your 👍/👎, double-check results, answers that needed correcting and your blind votes in Compare models all teach Automatic which model suits each kind of question.
- **The next answer is ready before you ask.** While you read an answer, the top suggested follow-up is answered in the background; click it and it appears at once. Typing anything else stops that work immediately.
- **Ready at start-up.** Your usual model loads and reads its instructions as soon as Quicksilver opens, so the first answer starts sooner.
- **Faster on graphics cards** with room to spare: long chats and sources are read in bigger batches.
- **Your cloud AI for hard questions** (optional, in Settings → General, since it uses your API credits). Without it on, a hard question suggests it once with one click.
- **Exact numbers first.** Sums, percentages, unit conversions and "days until…" in your question are worked out by the app and handed to the model, so even small models get the numbers right.
- **Every sum is audited.** Each "a × b = c" in an answer is recomputed; a wrong one is corrected straight away (no second model needed). JavaScript and JSON in answers are compiled (never run) and web pages are opened in a hidden, sealed-off window: errors are fixed automatically, once.
- **Checks where they matter.** When the model itself is unsure of a number it wrote, a second model double-checks the answer, even if Double-check is off.
- **Instant repeats.** Ask something you've rated 👍 (or that passed the double-check) again and the answer appears instantly. Regenerate for a fresh one.
- **Reads ahead while you type.** The model reads the conversation so far in the background, so pressing Enter only costs your new message. Also fixed: the model loaded while you type now starts with its speed helper.
- **Suggestions as you type.** Quicksilver reads your message before you send it and offers the one or two things that would help most: turn on web search for current topics, connect an app or cloud AI you mention (GitHub, Slack, ChatGPT, Claude…), attach the file you're talking about, search your Library, a stronger model or team for hard or coding questions, or an uncensored model for mature and dark creative writing. Click to apply, × to hide it for that chat.
- **When a model holds back,** a button under the answer asks an uncensored model instead (or helps you get one).
- **A calmer chat screen.** Fewer buttons under each answer (the rest are under ⋯), the double-check result and sources share one line, follow-ups are quiet links, and speed, time, the chat title and the "Ready" light only appear when they matter.

## What's new in Quicksilver 2.15

- **Faster teamwork.** On hard questions, the helper models now jot down the key points and your strongest model writes the answer once, instead of every model writing a full answer. Same accuracy, much less waiting. (Deep think still uses full answers from every model.)
- **Thinking only when it helps.** Models that can think step by step skip it for easy questions, so simple answers start right away.
- **Power moves** (AI Teams page): four little-known ways of making your own models answer better than they can alone. Majority vote (answers three times, takes the majority), Red team (a second model hunts for mistakes before you see the answer), Plan, then solve, and Expert panel (an expert, a sceptic and a creative thinker). One click builds each from the models you already have.
- **A short welcome** on Home for new users: ask anything right away, bring your ChatGPT or Claude chats, and set it up for your work.

## What's new in Quicksilver 2.14

- **Familiar names.** Stacks are now AI Teams, Studio is Create, Knowledge is Library, Integrations are Connectors, Arena is Compare models, and Fact check is Double-check. The effort levels are Instant, Balanced, Auto (recommended) and Deep think.
- **Smarter suggestions.** After each answer, the model that answered suggests the three things you're most likely to ask next, based on what it actually said. One click asks it.

## What's new in Quicksilver 2.13

- **Simpler.** The sidebar shows Home, Projects, Studio and Stacks; everything else is under More. The message box shows only ＋ (options), the mic and attach. Switch to the full view any time in Settings → General.
- **Automatic model choice.** Quicksilver picks the best model for each question: one that can see for photos, a coding model for code, and the team for hard questions when it can still answer in about a minute. Quick answers come first.
- **Three song stacks instead of thirteen:** a songwriter for any genre, a song doctor (critique, rewrite and translate), and a soundtrack & jingle composer. Every specialist stack still uses the strongest models your PC runs smoothly.

## What's new in Quicksilver 2.11

- **A calmer, clearer chat screen.** Each answer sits beside its assistant's icon in a comfortable reading column. The name, model and speed are one quiet line, and the time shows when you hover.
- **Actions as icons.** Copy, regenerate, try another model, listen and edit as a document sit in one row of icons under each answer. Continue, fact check, save as, branch and delete are under ⋯.
- **Follow-up suggestions.** Under the latest answer, one click asks a natural next question ("Give me an example", "Explain how this works"…).
- **Jump to latest.** When you scroll up to reread, a button takes you back to the newest message.
- Thinking now shimmers softly instead of spinning, and the tab bar no longer shows a scrollbar.

## What's new in Quicksilver 2.10

- **Try another model.** Under any answer: ask the same question to a different model or stack. Every version is kept; flip between them with ‹ ›.
- **Branch.** Start a new chat from any message. The original stays as it was.
- **Chat settings.** Extra instructions, creativity and answer length for one chat (⋯ → Chat settings).
- **Context meter.** See how much of the model's working memory a chat fills. When it's nearly full, "Continue in a fresh chat" carries a summary across.
- **Answer stats.** Hover the speed badge: time to the first words, tokens and total time.
- **Improve my prompt.** The ✨ button in the message box makes your message clearer and more complete before you send it. Ctrl+Z puts your original back.
- **Command palette.** Ctrl+Shift+P (or Ctrl+P): jump to any chat, project, model, skill or setting.
- **Maths.** Formulas are typeset properly.
- **HTML and SVG previews.** Code blocks with a web page or drawing get a Preview button.
- **Import from ChatGPT and Claude.** Settings → General: choose your export and your chats come across, grouped in a project.
- Fixed: the "Save as…" menu under answers closed as soon as it opened.

## Quicksilver 2.9

Memory, Projects, Edit as document, Arena (blind test), Voice typing and read-aloud, chat from your phone, and automatic updates.
