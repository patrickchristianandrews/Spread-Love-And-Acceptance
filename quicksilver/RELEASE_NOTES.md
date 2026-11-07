## What's new in Quicksilver 2.16

- **Answers correct themselves.** When Double-check is on and the second model finds a clear mistake, the answer is rewritten once with the correction (marked "✓ Corrected"; the first answer is still there with ‹ ›). A **Fix it** button in the check panel does the same on demand. Turn the automatic fix off in Settings → General.
- **👍 / 👎 on every answer.** Your votes teach Automatic which model does best for you on each kind of question (code, writing, working things out…).
- **Checks the web by itself** for questions about current things (news, prices, weather, the latest guidance), and says so. If search engines are blocked on your network, Wikipedia is used as a backup.
- **Faster on PCs without a graphics card.** Helper models that are much weaker than the lead are skipped, and the small starter model now speeds up the main one (same answers, less waiting).
- **Follow-up questions start sooner.** The model keeps the conversation it has already read in memory and only reads your new message, instead of re-reading the whole chat each time. Long chats trim old messages in blocks so this keeps working.
- **Faster web answers.** Only the parts of each page that match your question are read (about a third as much text), slow pages are skipped after a few seconds, and the model loads while the search runs.
- **Your next question goes first.** Suggestions, chat titles and memory notes running in the background stop the moment you ask something.
- **Big "mixture of experts" models on small graphics cards** (like Qwen3 30B-A3B) keep their shared parts on the card and only the extra experts in normal memory: often 2–3× faster.
- **GIF maker.** A new team and skill (type /gif): describe it and get a looping GIF made on your PC. Any video you make in chat also has a 🌀 GIF button.
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
