// Tester sessions: five different people use the INSTALLED app with the real models that come
// with Quicksilver, on the build machine (Windows, processor only). Every question, answer,
// time to first words, total time and model is recorded, so the sessions can be reviewed for
// how smart, how fast and how easy the app is.
//   node test/testers.js <path to Quicksilver.exe> [output folder]
// Results: <output>/<persona>.json (+ screenshots) and one TESTER-RESULT line per step in the log.
const { _electron: electron } = require('playwright');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

const [exe, outDir = 'tester-sessions'] = process.argv.slice(2);
const LONG = 8 * 60 * 1000;
fs.mkdirSync(outDir, { recursive: true });

const PERSONAS = [
  { id: 'maya', who: 'Maya, 34, runs a small bakery; first AI app; uses it for emails, prices and spreadsheets', steps: [
    { ask: 'Write a short, friendly email telling my regular customers we now open at 7am on Saturdays.' },
    { ask: 'I sell 120 croissants a day at £2.40. Flour costs went up 18% and flour is about a quarter of my cost per croissant (90p total cost). What should my new price be to keep the same profit per croissant? Show the working.' },
    { ask: 'Make an Excel-style table of a weekly cash-flow plan for a small bakery: income, rent, wages, ingredients, energy, and what is left.' },
    { action: 'followup' },
    { ask: 'Remember that my bakery is called Crumb & Co and it is in Leeds.' },
    { ask: 'Suggest three ideas for a spring promotion.', note: 'should use the remembered bakery name and city' },
  ] },
  { id: 'dev', who: 'Dev, 29, coder and freelance website developer; works from GitHub; builds a whole client site inside Quicksilver', steps: [
    { action: 'github', note: 'connects GitHub in Connectors (read-only token)' },
    { ask: 'Use GitHub to read the README.md of REPO and tell me in 3 short bullets what the project is.', tools: true, note: 'reads the repo through the GitHub connector' },
    { ask: 'There is a bug here, find it and fix it:\n```python\ndef average(nums):\n    total = 0\n    for n in nums:\n        total += n\n    return total / len(nums) if nums else total / 1\n```\nWhat happens with an empty list, and is the second branch right?' },
    { ask: 'Build the complete website for my client Crumb & Co, an artisan bakery in Leeds, as one HTML file with its CSS and JavaScript inside: a hero with a call to action, a menu section with 6 items and prices in £, opening hours (Mon-Fri 7am-4pm, Sat 7am-2pm, closed Sunday), an about section, a contact form and a footer. Responsive, accessible, no external files.', skill: 'build-site', site: ['<form', 'menu', '£', 'Sunday'], note: 'builds the site (Landing page skill)' },
    { ask: 'Add a dark mode toggle button in the header that remembers the choice, and a photo gallery section with 6 placeholder tiles. Keep everything else. Give me the full updated file.', same: true, site: ['dark', 'gallery', '<form', '£'], note: 'edits the site in the same chat' },
    { ask: 'Bug: submitting the contact form reloads the page. Fix it so it checks the email field and shows a thank-you message instead. Full updated file please.', same: true, site: ['preventDefault', 'thank', 'dark', 'gallery'], note: 'fixes a bug in the site' },
    { action: 'approval', ask: 'Use GitHub to create an issue in REPO titled "Crumb & Co site: launch checklist" listing 5 launch steps.', note: 'a write action must ask first; the tester declines' },
    { action: 'powermove', kind: 'redteam', ask: 'Is it safe to store user passwords with SHA-256 and a salt? What should I use instead?' },
  ] },
  { id: 'rosa', who: 'Rosa, 61, retired teacher; not technical; prefers talking to typing; wants plain answers', steps: [
    { action: 'voice', note: 'speech recorded by Windows: "The quick brown fox jumps over the lazy dog."' },
    { ask: 'My grandson says I should use a password manager. What is that, in simple words, and is it safe?' },
    { ask: 'Give me a gentle 10-minute morning stretching routine for someone with stiff knees.' },
    { action: 'followup' },
    { ask: 'What colour is this picture? Answer with one word.', file: 'red', note: 'photo question' },
  ] },
  { id: 'jay', who: 'Jay, 19, student and bedroom musician; wants songs, ideas and study help fast', steps: [
    { ask: 'Write a short pop song about missing the last bus home, with chords.', skill: 'song-writer' },
    { ask: 'Explain photosynthesis like I have an exam tomorrow: key points only.' },
    { ask: 'Quiz me with 3 multiple-choice questions on the French Revolution, then give the answers.' },
    { action: 'doc', note: 'opens the last answer as a document and makes it shorter' },
    { action: 'look', view: 'studio', note: 'Create page: pictures, video and music' },
  ] },
  { id: 'priya', who: 'Priya, 45, nurse and part-time researcher; privacy matters; needs accurate, sourced answers', steps: [
    { ask: 'What is the normal adult resting heart rate range, and when should a fast resting heart rate be checked by a doctor?', fact: true, note: 'double-check on' },
    { ask: 'What does the latest NHS guidance say about vitamin D supplements in winter?', web: true, note: 'web search' },
    { action: 'project', name: 'Night shift study', instructions: 'Answers are for a nurse. Be precise and cite the file when used.', file: { name: 'notes.txt', text: 'Ward policy: patients on warfarin need INR checked every Monday and Thursday. Escalate an INR above 4.5 to the on-call doctor.' }, ask: 'When do patients on warfarin get their INR checked, and when do I escalate?' },
    { ask: 'Summarise the pros and cons of 12-hour nursing shifts in a short table.', private: true, note: 'private chat (no memory)' },
  ] },
];

// Group B: five more people, for the newer features (exam coaches, exact numbers, suggestions,
// answers in advance, instant repeats, offline with your own documents, code checks).
const PERSONAS_B = [
  { id: 'alex', who: 'Alex, 24, accounting graduate; sits CPA FAR next month; wants practice and a plan', steps: [
    { action: 'study', assistant: 'as-cpa', section: 'FAR', note: 'CPA coach: opens FAR from the dashboard (lesson + practice questions)' },
    { action: 'quiz', note: 'answers the practice questions (right on odd questions, wrong on even ones)' },
    { action: 'weak', note: '"More on my weak spots"' },
    { action: 'quiz', note: 'answers the new questions' },
    { ask: 'A company leases equipment for 5 years with annual payments of $20,000 made at the start of each year, and the rate is 6%. What is the initial lease liability? Show the working.', same: true, note: 'lease calculation (annuity due): about $89,302' },
    { ask: 'Make me a 10-week study plan for FAR: 15 hours a week, exam on 15 March.', same: true, note: 'study plan' },
  ] },
  { id: 'grace', who: 'Grace, 33, internal auditor; studying for CIA Part 1; careful about the new Global Internal Audit Standards', steps: [
    { action: 'study', assistant: 'as-cia', section: 'Part 1', note: 'CIA coach: opens Part 1 from the dashboard' },
    { action: 'quiz', note: 'answers the practice questions' },
    { ask: 'Explain the difference between assurance and advisory services under the Global Internal Audit Standards, with an example of each.', same: true, note: 'concept question' },
    { ask: 'Quiz me on fraud risk: 5 questions.', same: true, note: 'topic quiz' },
    { action: 'quiz', note: 'answers the fraud risk questions' },
  ] },
  { id: 'marcus', who: 'Marcus, 47, landlord with three flats; wants exact numbers and current rules', steps: [
    { ask: 'I charge £950 a month rent. If I raise it by 3.5%, what is the new rent? And what is 20% VAT on a £2,340 boiler repair?', note: 'exact numbers: £983.25 and £468 (total £2,808)' },
    { ask: 'Convert 12 miles to km and 23°C to Fahrenheit for my tenant welcome pack.', note: 'conversions: 19.31 km, 73.4 °F' },
    { ask: 'How many days until Christmas?', note: 'date gap worked out by the app' },
    { ask: 'What are the latest UK rules for landlords on energy performance certificates (EPC)?', note: 'current topic: should search the web by itself' },
    { ask: 'Make a table of my 3 flats with rents of £950, £1,100 and £875 a month, with the monthly and yearly totals.', note: 'totals: £2,925 a month, £35,100 a year (sums audited)' },
  ] },
  { id: 'lena', who: 'Lena, 29, content creator; writes horror shorts and social posts; wants speed', steps: [
    { action: 'type', text: 'Write a dark horror story with graphic violence for my channel', note: 'what Quicksilver suggests while she types' },
    { ask: 'Write a dark horror story with graphic violence for my channel, about 200 words.', note: 'mature creative request' },
    { ask: 'Write 3 punchy Instagram captions for a coffee shop opening, under 15 words each.' },
    { action: 'preanswer', note: 'clicks the top follow-up: answered while she read?' },
    { action: 'repeat', ask: 'What is a good posting schedule for TikTok?', note: 'rates 👍, asks again in a new chat: instant?' },
    { ask: 'A cat giving a thumbs up', skill: 'make-gif', note: 'GIF maker (no video model on this PC yet: should say what to get)' },
  ] },
  { id: 'omar', who: 'Omar, 52, IT manager; privacy first; works offline with the company policies', steps: [
    { action: 'offline', note: 'switches to Offline' },
    { action: 'kb', name: 'IT policies', doc: 'it-policy.md', text: 'IT security policy.\n\nPasswords: minimum 14 characters, rotated every 180 days. Multi-factor authentication (MFA) is required for VPN and email.\n\nLaptops must use BitLocker full-disk encryption. Report incidents to the service desk on extension 4455 within one hour.', note: 'adds the company policy to the Library' },
    { ask: 'What is our minimum password length and how often do passwords rotate?', note: 'should find the policy in the Library by itself: 14 characters, 180 days' },
    { ask: 'Write a JavaScript function that checks a password has at least 14 characters and at least one number. Just the code and one line of explanation.', note: 'code is compiled to check it' },
    { action: 'doc', note: 'opens the answer as a document and makes it shorter' },
    { action: 'online', note: 'back online' },
  ] },
];

function redPng(size = 64) {
  const zlib = require('node:zlib');
  const t = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = (b) => { let c = 0xffffffff; for (const x of b) c = t[(c ^ x) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (ty, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(ty), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
  const ih = Buffer.alloc(13); ih.writeUInt32BE(size, 0); ih.writeUInt32BE(size, 4); ih[8] = 8; ih[9] = 2;
  const row = Buffer.concat([Buffer.from([0]), Buffer.from(Array.from({ length: size }, () => [220, 30, 30]).flat())]);
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ih), chunk('IDAT', zlib.deflateSync(Buffer.concat(Array.from({ length: size }, () => row)))), chunk('IEND', Buffer.alloc(0))]);
}

async function session(p) {
  const HOME = fs.mkdtempSync(path.join(os.tmpdir(), `qs-tester-${p.id}-`));
  // QS_TESTER_DEV=1: a practice run of the sessions against the source app and stand-in engines.
  const DEV = process.env.QS_TESTER_DEV;
  const ROOT = path.join(__dirname, '..');
  if (DEV) {
    const tiny = path.join(ROOT, 'test/fixtures/tiny.gguf');
    const copy = (n) => { const f = path.join(HOME, n); fs.copyFileSync(tiny, f); return f; };
    fs.writeFileSync(path.join(HOME, 'models.json'), JSON.stringify([{ id: 'starter', name: 'Qwen3-VL 2B', kind: 'text', catalogId: 'qwen3-vl-2b', files: { model: copy('a.gguf'), mmproj: copy('mmproj-a.gguf') }, size: 1e9, vision: true }, { id: 'starter-brain', name: 'Qwen3 4B', kind: 'text', catalogId: 'qwen3-4b', files: { model: copy('b.gguf') }, size: 2.4e9 }]));
    fs.writeFileSync(path.join(HOME, 'stacks.json'), JSON.stringify([{ id: 'quicksilver', name: 'Quicksilver', emoji: '💧', members: { drafters: ['local:starter-brain', 'local:starter'], judge: 'local:starter-brain', vision: 'local:starter', mode: 'auto' } }]));
    fs.writeFileSync(path.join(HOME, 'whisper.bin'), Buffer.alloc(2e6));
  }
  const app = await electron.launch(DEV
    ? { executablePath: require(path.join(ROOT, 'node_modules/electron')), args: ['--no-sandbox', ROOT], env: { ...process.env, QUICKSILVER_HOME: HOME, QS_LLAMA_SERVER: path.join(ROOT, 'test/fakes/llama-server'), QS_SD_BIN: path.join(ROOT, 'test/fakes/sd'), QS_WHISPER_BIN: path.join(ROOT, 'test/fakes/whisper-cli'), QS_WHISPER_MODEL: path.join(HOME, 'whisper.bin'), QS_SCAN_DIRS: path.join(HOME, 'none') } }
    : { executablePath: exe, env: { ...process.env, QUICKSILVER_HOME: HOME } });
  const win = await app.firstWindow();
  await win.setViewportSize({ width: 1440, height: 900 });
  const errors = [];
  win.on('pageerror', (e) => errors.push(e.message));
  win.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
  const shot = (name) => win.screenshot({ path: path.join(outDir, `${p.id}-${name}.png`) }).catch(() => {});
  const idle = (timeout = LONG) => win.waitForFunction(() => !document.querySelector('.bubble.streaming') && !document.querySelector('.status-line') && !document.querySelector('.fact-chip.k-run'), null, { timeout });
  const results = [];
  await win.waitForSelector('text=Forms to fit your work.', { timeout: 120000 });
  await win.waitForFunction(() => S.installed.some((m) => m.id === 'starter'), null, { timeout: 120000 });
  await win.waitForTimeout(3000);
  await shot('00-first-look');
  const lastAnswer = () => win.evaluate(() => {
    const c = chatById(S.route.id);
    const m = [...(c?.messages || [])].reverse().find((x) => x.role === 'assistant');
    const a = m?.alts[m.altIndex] || {};
    return { text: a.text || a.error || '', error: a.error || '', model: a.target ? targetLabel(a.target) : '', autoWhy: a.autoWhy || '', ttftMs: a.ttft ?? null, totalMs: a.ms ?? null, tokens: a.stats?.tokens ?? null, tps: a.stats?.tps ?? null,
      steps: (a.steps || []).map((s) => `${s.label} (${s.model}${s.ms ? `, ${Math.round(s.ms / 1000)} s` : ''})`), tools: (a.toolCalls || []).map((x) => `${x.name} → ${x.status}`), badges: [a.fixed && 'Corrected', a.cached && 'Instant', a.preAnswered && 'Ready before you asked', a.autoWeb && 'Checked the web', a.autoLib && 'Library', a.unsure && 'Unsure number checked', a.webEmpty && 'Web: nothing found'].filter(Boolean), media: a.media ? { need: a.media.need || '', error: a.media.error || '', items: (a.media.items || []).length } : null,
      quiz: [...String(a.text || '').matchAll(/```quiz\s*\n([\s\S]*?)```/g)].map((m) => { const q = typeof parseQuiz === 'function' ? parseQuiz(m[1]) : null; return q ? { topic: q.topic, section: q.section, questions: q.questions.map((x) => ({ q: x.q, choices: x.choices, answer: x.answer, why: x.why })) } : { invalid: m[1].slice(0, 300) }; }), check: a.check ? { text: (a.check.text || '').slice(0, 1200), error: a.check.error || '' } : null, followups: a.followups || [], remembered: a.remembered || [], sources: (a.sources || []).map((s) => s.url || s.title).slice(0, 8) };
  });
  const REPO = process.env.QS_TESTER_GH_REPO || 'patrickchristianandrews/Spread-Love-And-Acceptance';
  const ask = async (step, i) => {
    if (!step.same) await win.click('[data-nav="newchat"]');
    await win.waitForSelector('#input');
    await win.evaluate((st) => {
      const c = chatById(S.route.id);
      if (st.target) c.target = st.target;
      if (st.effort) c.effort = st.effort;
      if (st.fact) c.factCheck = true;
      if (st.web) c.web = true;
      if (st.private) c.private = true;
      if (st.skill) c.pendingSkill = st.skill;
      if (st.tools) c.tools = true;
      if (st.assistant) c.assistantId = st.assistant;
      save(); render();
    }, step);
    if (step.file === 'red') { await win.setInputFiles('#file-in', { name: 'photo.png', mimeType: 'image/png', buffer: redPng() }); await win.waitForSelector('.attach'); }
    await win.fill('#input', step.ask.replace(/REPO/g, REPO));
    const t = Date.now();
    const before = await win.locator('.msg.assistant').count();
    await win.keyboard.press('Enter');
    await win.waitForFunction((n) => document.querySelectorAll('.msg.assistant').length > n, before, { timeout: 60000 });
    await idle(step.site ? 25 * 60 * 1000 : LONG);
    await win.waitForTimeout(1500);
    // Give the follow-up suggestions a moment to be written.
    await win.waitForFunction(() => !document.querySelector('.followups.pending'), null, { timeout: 60000 }).catch(() => {});
    const r = await lastAnswer();
    r.wallMs = Date.now() - t;
    await shot(`${String(i).padStart(2, '0')}-answer`);
    return r;
  };
  for (const [i, step] of p.steps.entries()) {
    const rec = { step: i + 1, note: step.note || '', action: step.action || 'ask', input: step.ask || '' };
    try {
      if (!step.action) {
        Object.assign(rec, await ask(step, i + 1));
        if (step.site) {
          const html = await win.evaluate(() => { const c = chatById(S.route.id); const m = [...c.messages].reverse().find((x) => x.role === 'assistant'); return appHtmlOf(msgText(m)) || ''; });
          const file = path.join(outDir, `${p.id}-site-${i + 1}.html`);
          if (html) fs.writeFileSync(file, html);
          const low = html.toLowerCase();
          rec.site = { bytes: html.length, complete: /<\/html>\s*$/i.test(html.trim()), sections: (low.match(/<section\b/g) || []).length, has: Object.fromEntries(step.site.map((w) => [w, low.includes(w.toLowerCase())])), file: html ? path.basename(file) : '' };
          if (!html) rec.error = 'No complete HTML page in the answer.';
          else if (await win.locator('.msg.assistant').last().locator('[data-act="app-open"]').count()) {
            const opened = app.waitForEvent('window', { timeout: 30000 });
            await win.locator('.msg.assistant').last().locator('[data-act="app-open"]').click();
            const pw = await opened;
            const perrs = [];
            pw.on('pageerror', (e) => perrs.push(e.message));
            await pw.waitForLoadState().catch(() => {});
            await pw.reload().catch(() => {});
            await pw.setViewportSize({ width: 1280, height: 900 }).catch(() => {});
            await pw.waitForTimeout(1500);
            await pw.screenshot({ path: path.join(outDir, `${p.id}-${String(i + 1).padStart(2, '0')}-site-preview.png`), fullPage: true }).catch(() => {});
            rec.site.previewErrors = perrs.slice(0, 5);
            rec.site.previewText = (await pw.evaluate(() => document.body.innerText).catch(() => '')).slice(0, 600);
            await pw.close().catch(() => {});
            rec.site.opened = true;
          } else rec.site.opened = false;
        }
      } else if (step.action === 'study') {
        await win.click('[data-nav="newchat"]');
        await win.selectOption('#pick-assistant', step.assistant);
        await win.waitForSelector(`.study-sec:has-text("${step.section}")`, { timeout: 30000 });
        const before = await win.locator('.msg.assistant').count();
        const t = Date.now();
        await win.click(`.study-sec:has-text("${step.section}")`);
        await win.waitForFunction((n) => document.querySelectorAll('.msg.assistant').length > n, before, { timeout: 60000 });
        await idle(15 * 60 * 1000);
        Object.assign(rec, await lastAnswer(), { input: `Dashboard: ${step.section}`, wallMs: Date.now() - t });
        await shot(`${String(i + 1).padStart(2, '0')}-study`);
      } else if (step.action === 'quiz') {
        const qz = win.locator('.quiz').last();
        if (!(await qz.count()) || !(await qz.locator('.qz-c').count())) rec.error = 'No interactive practice questions in the last answer.';
        else {
          const picks = [];
          for (let n = 0; n < 12; n++) {
            const open = qz.locator('.qz:not(.done)');
            if (!(await open.count())) break;
            const idx = Number(await open.first().getAttribute('data-i'));
            const info = await win.evaluate(({ id, idx }) => { const q = parseQuiz(quizCodes.get(id)).questions[idx]; return { answer: Number(q.answer), n: q.choices.length }; }, { id: await qz.getAttribute('data-quiz'), idx });
            const k = idx % 2 === 0 ? info.answer : (info.answer + 1) % info.n;
            picks.push({ q: idx + 1, picked: k, correct: info.answer });
            await open.first().locator(`.qz-c[data-k="${k}"]`).click();
            await win.waitForTimeout(300);
          }
          rec.picks = picks;
          rec.text = await qz.innerText();
          rec.study = await win.evaluate(() => S.data.study);
          await shot(`${String(i + 1).padStart(2, '0')}-quiz`);
        }
      } else if (step.action === 'weak') {
        const before = await win.locator('.msg.assistant').count();
        const t = Date.now();
        await win.locator('[data-qz-next]').last().click();
        await win.waitForFunction((n) => document.querySelectorAll('.msg.assistant').length > n, before, { timeout: 60000 });
        await idle(15 * 60 * 1000);
        Object.assign(rec, await lastAnswer(), { input: await win.evaluate(() => [...chatById(S.route.id).messages].reverse().find((m) => m.role === 'user')?.text || ''), wallMs: Date.now() - t });
        await shot(`${String(i + 1).padStart(2, '0')}-weak`);
      } else if (step.action === 'type') {
        await win.click('[data-nav="newchat"]');
        await win.fill('#input', step.text);
        await win.waitForTimeout(1200);
        rec.input = step.text;
        rec.hints = await win.evaluate(() => [...document.querySelectorAll('#hint-row .hint-go')].map((b) => `${b.textContent.trim()} (${b.title})`));
        rec.text = rec.hints.length ? `Suggested: ${rec.hints.join(' | ')}` : 'No suggestions shown.';
        await shot(`${String(i + 1).padStart(2, '0')}-suggestions`);
        await win.fill('#input', '');
      } else if (step.action === 'offline' || step.action === 'online') {
        const want = step.action === 'offline';
        if (Boolean(await win.evaluate(() => S.config?.offline)) !== want) await win.click('#net-toggle');
        await win.waitForFunction((w) => Boolean(S.config?.offline) === w, want, { timeout: 30000 });
        rec.text = want ? 'Offline: nothing leaves this PC.' : 'Back online.';
      } else if (step.action === 'kb') {
        const r = await win.evaluate(async (st) => { const c = await qs.call('kb:create', { name: st.name, emoji: '🗂️' }); await qs.call('kb:addText', c.id, st.doc, st.text); return (await qs.call('kb:list')).collections.find((x) => x.id === c.id); }, step);
        rec.text = `Library "${r?.name}": ${r?.docs} document, ${r?.passages} passage(s).`;
      } else if (step.action === 'preanswer') {
        const ready = await win.waitForFunction(() => { const c = chatById(S.route.id); const a = c?.messages.at(-1)?.alts?.at(-1); return a?.pre?.done || (a?.followups?.length && !a.pre && Date.now() - (a.preT ||= Date.now()) > 20000); }, null, { timeout: LONG }).then(() => true).catch(() => false);
        rec.preReady = await win.evaluate(() => Boolean(chatById(S.route.id)?.messages.at(-1)?.alts?.at(-1)?.pre?.done));
        const q = await win.evaluate(() => document.querySelector('.followups .fu')?.dataset.followup || '');
        if (!q) rec.error = `No follow-up to click (waited: ${ready}).`;
        else {
          const before = await win.locator('.msg.assistant').count();
          const t = Date.now();
          await win.click('.followups .fu >> nth=0');
          await win.waitForFunction((n) => document.querySelectorAll('.msg.assistant').length > n, before, { timeout: 60000 });
          await idle();
          Object.assign(rec, await lastAnswer(), { input: q, wallMs: Date.now() - t });
          await shot(`${String(i + 1).padStart(2, '0')}-preanswer`);
        }
      } else if (step.action === 'repeat') {
        const first = await ask({ ask: step.ask }, i + 1);
        await win.locator('[data-act="up"]').last().click();
        await win.waitForTimeout(500);
        const t = Date.now();
        await win.click('[data-nav="newchat"]');
        await win.fill('#input', step.ask);
        await win.keyboard.press('Enter');
        await win.waitForSelector('.msg.assistant', { timeout: 60000 });
        await idle();
        Object.assign(rec, await lastAnswer(), { input: step.ask, wallMs: Date.now() - t, firstWallMs: first.wallMs });
        await shot(`${String(i + 1).padStart(2, '0')}-repeat`);
      } else if (step.action === 'github') {
        const token = process.env.QS_TESTER_GH_TOKEN;
        if (!token) rec.error = 'No GitHub token on this machine.';
        else {
          await win.evaluate(() => go({ view: 'integrations' }));
          await win.waitForSelector('[data-int-edit="github"]', { timeout: 60000 });
          await win.click('[data-int-edit="github"]');
          await win.fill('#f-token', token);
          await win.click('#int-save');
          const ok = await win.waitForSelector('[data-int-off="github"]', { timeout: 60000 }).then(() => true).catch(() => false);
          if (!ok) throw new Error(`GitHub didn't connect: ${(await win.evaluate(() => [...document.querySelectorAll('.toast, #modal .notice, #modal .help')].map((e) => e.textContent).join(' | ')).catch(() => '')).slice(0, 300)}`);
          rec.text = 'GitHub connected.';
          await shot(`${String(i + 1).padStart(2, '0')}-github-connected`);
        }
      } else if (step.action === 'approval') {
        await win.click('[data-nav="newchat"]');
        await win.evaluate(() => { const c = chatById(S.route.id); c.tools = true; save(); render(); });
        await win.fill('#input', step.ask.replace(/REPO/g, REPO));
        const t = Date.now();
        await win.keyboard.press('Enter');
        const asked = await win.waitForSelector('[data-ap="deny"]', { timeout: LONG }).then(() => true).catch(() => false);
        rec.approvalShown = asked;
        if (asked) { await shot(`${String(i + 1).padStart(2, '0')}-approval`); await win.click('[data-ap="deny"]'); }
        await idle();
        Object.assign(rec, await lastAnswer(), { input: step.ask.replace(/REPO/g, REPO), wallMs: Date.now() - t });
        await shot(`${String(i + 1).padStart(2, '0')}-approval-answer`);
      }
      else if (step.action === 'followup') {
        const q = await win.evaluate(() => document.querySelector('.followups .fu:not(.ghost)')?.dataset.followup || '');
        rec.input = q;
        if (!q) rec.error = 'No follow-up suggestions were shown.';
        else {
          const t = Date.now();
          await win.click('.followups .fu:not(.ghost) >> nth=0');
          await win.waitForTimeout(1000);
          await idle();
          Object.assign(rec, await lastAnswer(), { wallMs: Date.now() - t });
          await shot(`${String(i + 1).padStart(2, '0')}-followup`);
        }
      } else if (step.action === 'voice') {
        const wav = path.resolve('speech.wav');
        if (!fs.existsSync(wav)) rec.error = 'No recorded speech on this machine.';
        else {
          const t = Date.now();
          let st = await win.evaluate(() => qs.call('voice:status'));
          // A fresh install downloads the speech model the first time (like clicking the mic).
          if (!st.ready) { const s0 = Date.now(); await win.evaluate(() => qs.call('voice:setup')); rec.setupMs = Date.now() - s0; st = await win.evaluate(() => qs.call('voice:status')); }
          rec.output = await win.evaluate((bytes) => qs.call('voice:transcribe', new Uint8Array(bytes), { ext: 'wav' }), [...fs.readFileSync(wav)]);
          rec.text = `Heard: "${rec.output}"`; rec.wallMs = Date.now() - t; rec.voiceReady = st.ready;
        }
      } else if (step.action === 'powermove') {
        await win.click('[data-nav="stacks"]');
        await win.waitForSelector(`[data-pm="${step.kind}"]`, { timeout: 60000 });
        await win.click(`[data-pm="${step.kind}"]`);
        await win.waitForFunction((k) => chatById(S.route.id)?.target === `stack:pm-${k}`, step.kind, { timeout: 60000 });
        await win.fill('#input', step.ask);
        const t = Date.now();
        await win.keyboard.press('Enter');
        await win.waitForSelector('.msg.assistant');
        await idle();
        Object.assign(rec, await lastAnswer(), { input: step.ask, wallMs: Date.now() - t, team: step.kind });
        await shot(`${String(i + 1).padStart(2, '0')}-powermove`);
      } else if (step.action === 'doc') {
        await win.click('.msg.assistant:last-child [data-act="more"]'); await win.click('.menu [data-mm="doc"]');
        await win.waitForSelector('#dp-text');
        const before = await win.inputValue('#dp-text');
        const t = Date.now();
        await win.click('[data-dp-do="shorter"]');
        await win.waitForFunction(() => !document.querySelector('.dp-body.busy'), null, { timeout: LONG });
        const after = await win.inputValue('#dp-text');
        Object.assign(rec, { input: 'Edit as document → Shorter', text: after.slice(0, 3000), wallMs: Date.now() - t, beforeWords: before.split(/\s+/).length, afterWords: after.split(/\s+/).length });
        await shot(`${String(i + 1).padStart(2, '0')}-document`);
        await win.click('[data-dp="close"]').catch(() => {});
      } else if (step.action === 'project') {
        await win.click('[data-nav="projects"]');
        await win.click('#pj-new');
        await win.fill('#pe-name', step.name);
        await win.fill('#pe-ins', step.instructions);
        await win.click('#pe-ok');
        await win.waitForSelector('#pj-file', { state: 'attached' });
        await win.setInputFiles('#pj-file', { name: step.file.name, mimeType: 'text/plain', buffer: Buffer.from(step.file.text) });
        await win.waitForSelector('.proj-file');
        await win.fill('#pj-q', step.ask);
        const t = Date.now();
        await win.click('#pj-send');
        await win.waitForSelector('.msg.assistant', { timeout: 60000 });
        await idle();
        Object.assign(rec, await lastAnswer(), { input: step.ask, wallMs: Date.now() - t, fileGiven: step.file.text });
        await shot(`${String(i + 1).padStart(2, '0')}-project`);
      } else if (step.action === 'look') {
        await win.click(`[data-nav="${step.view}"]`);
        await win.waitForTimeout(2000);
        rec.text = (await win.evaluate(() => document.querySelector('#main').innerText)).slice(0, 1500);
        await shot(`${String(i + 1).padStart(2, '0')}-${step.view}`);
      }
    } catch (err) {
      rec.error = String(err.message || err).split('\n')[0];
      await shot(`${String(i + 1).padStart(2, '0')}-error`);
      // Don't let an open dialog block the next steps.
      for (let k = 0; k < 3 && await win.locator('#modal:not([hidden])').count(); k++) await win.click('#modal [data-close], #modal [data-ap="deny"]').catch(() => win.keyboard.press('Escape'));
      if (step.action === 'github') rec.dialog = await win.evaluate(() => document.querySelector('.toast')?.textContent || '').catch(() => '');
    }
    if (rec.text) rec.text = rec.text.slice(0, 4000);
    results.push(rec);
    console.log(`TESTER-RESULT ${JSON.stringify({ persona: p.id, ...rec })}`);
  }
  const out = { persona: p.id, who: p.who, pc: await win.evaluate(() => S.est?.hardware || null).catch(() => null), results, appErrors: errors };
  fs.writeFileSync(path.join(outDir, `${p.id}.json`), JSON.stringify(out, null, 2));
  await app.close();
}

(async () => {
  const group = process.env.QS_TESTER_GROUP || 'a';
  const all = group === 'all' ? [...PERSONAS, ...PERSONAS_B] : group === 'b' ? PERSONAS_B : PERSONAS;
  for (const p of all.filter((x) => !process.env.QS_TESTER_ONLY || process.env.QS_TESTER_ONLY.split(',').includes(x.id))) {
    const t = Date.now();
    try { await session(p); console.log(`✓ ${p.id}: done in ${Math.round((Date.now() - t) / 1000)} s`); }
    catch (err) { console.log(`✗ ${p.id}: ${err.message.split('\n')[0]}`); }
  }
})();
