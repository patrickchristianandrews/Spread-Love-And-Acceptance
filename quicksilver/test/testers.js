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
  { id: 'dev', who: 'Dev, 27, software developer and AI enthusiast; cares about correctness, speed and power features', steps: [
    { ask: 'Write a JavaScript function that returns the n-th Fibonacci number in O(log n) time, with a short explanation.' },
    { ask: 'There is a bug here, find it and fix it:\n```python\ndef average(nums):\n    total = 0\n    for n in nums:\n        total += n\n    return total / len(nums) if nums else total / 1\n```\nWhat happens with an empty list, and is the second branch right?' },
    { ask: 'What is 17 × 23? Work it out step by step.', target: 'stack:quicksilver', note: 'team route' },
    { ask: 'A bat and a ball cost $1.10 in total. The bat costs $1.00 more than the ball. How much does the ball cost?', effort: 'max', note: 'Deep think: whole team + double-check' },
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
  const idle = () => win.waitForFunction(() => !document.querySelector('.bubble.streaming') && !document.querySelector('.status-line') && !document.querySelector('.fact-chip.k-run'), null, { timeout: LONG });
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
      steps: (a.steps || []).map((s) => `${s.label} (${s.model}${s.ms ? `, ${Math.round(s.ms / 1000)} s` : ''})`), check: a.check ? { text: (a.check.text || '').slice(0, 1200), error: a.check.error || '' } : null, followups: a.followups || [], remembered: a.remembered || [], sources: (a.sources || []).map((s) => s.url || s.title).slice(0, 8) };
  });
  const ask = async (step, i) => {
    await win.click('[data-nav="newchat"]');
    await win.waitForSelector('#input');
    await win.evaluate((st) => {
      const c = chatById(S.route.id);
      if (st.target) c.target = st.target;
      if (st.effort) c.effort = st.effort;
      if (st.fact) c.factCheck = true;
      if (st.web) c.web = true;
      if (st.private) c.private = true;
      if (st.skill) c.pendingSkill = st.skill;
      save(); render();
    }, step);
    if (step.file === 'red') { await win.setInputFiles('#file-in', { name: 'photo.png', mimeType: 'image/png', buffer: redPng() }); await win.waitForSelector('.attach'); }
    await win.fill('#input', step.ask);
    const t = Date.now();
    await win.keyboard.press('Enter');
    await win.waitForSelector('.msg.assistant', { timeout: 60000 });
    await idle();
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
      if (!step.action) Object.assign(rec, await ask(step, i + 1));
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
        await win.click('.msg.assistant:last-child [data-act="doc"]');
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
    } catch (err) { rec.error = String(err.message || err).split('\n')[0]; await shot(`${String(i + 1).padStart(2, '0')}-error`); }
    if (rec.text) rec.text = rec.text.slice(0, 4000);
    results.push(rec);
    console.log(`TESTER-RESULT ${JSON.stringify({ persona: p.id, ...rec })}`);
  }
  const out = { persona: p.id, who: p.who, pc: await win.evaluate(() => S.est?.hardware || null).catch(() => null), results, appErrors: errors };
  fs.writeFileSync(path.join(outDir, `${p.id}.json`), JSON.stringify(out, null, 2));
  await app.close();
}

(async () => {
  for (const p of PERSONAS) {
    const t = Date.now();
    try { await session(p); console.log(`✓ ${p.id}: done in ${Math.round((Date.now() - t) / 1000)} s`); }
    catch (err) { console.log(`✗ ${p.id}: ${err.message.split('\n')[0]}`); }
  }
})();
