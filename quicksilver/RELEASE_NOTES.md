### Download

There are three ways to get Quicksilver 2.20. All install the same app; they differ in how the Liquid Edition's models (about 30 GB) arrive.

- **Quicksilver-Setup-2.20.0.exe** (below, about 1.9 GB, with a matching `.sha256`): the installer with the small 2B model inside. The first time Quicksilver opens, its setup screen downloads the rest of the Liquid Edition before the app starts.
- **Quicksilver-Web-Setup-2.20.0.exe** (below, about 200 MB): the web installer. No models inside at all; the setup screen downloads the whole Liquid Edition on first launch.
- **Full offline package** (about 31 GB): the installer plus a "Quicksilver models" folder. Keep the two together when you run the installer and everything is copied in: nothing to download, works with no internet from the first minute. It is too large for a GitHub release file, so it is the **Quicksilver-Windows-installer** build artifact on this release's build run (linked at the top of these notes; a GitHub sign-in is needed, and GitHub keeps build artifacts for 90 days).

Updating from 2.19: nothing extra to download; your chats, settings and models are kept.

Updating from 2.18: the Liquid Edition now includes its Closer and its picture and video makers, and Quicksilver does not open until all of them are installed. After the update the setup screen downloads what is missing (about 30 GB) before the app starts. Your chats, settings and the models you already have are kept.

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
