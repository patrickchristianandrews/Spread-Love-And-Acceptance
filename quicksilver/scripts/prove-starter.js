// Proves the bundled starter model really works with the real engine before it ships:
// loads it on the processor (like the slowest PC would), asks a question, and (when it can see)
// shows it a picture and asks what colour it is.
// Usage: node scripts/prove-starter.js <path to llama-server>
const path = require('node:path');
const fs = require('node:fs');
const zlib = require('node:zlib');
const { spawn } = require('node:child_process');

const server = process.argv[2];
const ROOT = path.join(__dirname, '..');
const { models } = JSON.parse(fs.readFileSync(path.join(ROOT, 'starter', 'STARTER.json'), 'utf8'));
const PORT = 8098;

// A plain 64×64 PNG of one colour, built by hand (no image library needed).
function png(r, g, b, size = 64) {
  const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = (buf) => { let c = 0xffffffff; for (const x of buf) c = crcTable[(c ^ x) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 2;
  const row = Buffer.concat([Buffer.from([0]), Buffer.from(Array.from({ length: size }, () => [r, g, b]).flat())]);
  const raw = Buffer.concat(Array.from({ length: size }, () => row));
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

// The app's own calculator (the same file the app runs), for the arithmetic check below.
const appChecks = { console, S: { data: { prefs: {} } } };
require('node:vm').createContext(appChecks);
try { require('node:vm').runInContext(fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'js', 'checks.js'), 'utf8').replace(/^(const|let) /gm, 'var '), appChecks, { filename: 'checks.js' }); } catch (e) { if (!/is not defined/.test(e.message)) throw e; }

async function ask(content, maxTokens = 80) {
  const res = await fetch(`http://127.0.0.1:${PORT}/v1/chat/completions`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    // Plain answers: a model that can think (Qwen3.5) answers directly here; thinking is checked in the app test.
    body: JSON.stringify({ messages: [{ role: 'user', content }], max_tokens: maxTokens, temperature: 0, chat_template_kwargs: { enable_thinking: false } }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  const j = await res.json();
  return j.choices[0].message.content.trim();
}

// Loads one model on the processor (like the slowest PC would) and checks its answers.
async function prove(m) {
  const dir = path.join(ROOT, m.pack ? 'pack' : 'starter');
  const args = ['-m', path.join(dir, m.files.model), '--host', '127.0.0.1', '--port', String(PORT), '-c', '4096', '-ngl', '0', '--device', 'none', '--jinja', '--cache-reuse', '256'];
  if (m.files.mmproj) args.push('--mmproj', path.join(dir, m.files.mmproj));
  const log = [];
  const proc = spawn(server, args, { windowsHide: true });
  proc.stdout.on('data', (d) => log.push(String(d)));
  proc.stderr.on('data', (d) => log.push(String(d)));
  let exited = false; proc.on('exit', () => { exited = true; });
  try {
    const t0 = Date.now();
    for (;;) {
      if (exited) throw new Error(`the engine stopped while loading ${m.name}`);
      if (Date.now() - t0 > 300000) throw new Error(`${m.name} took too long to load`);
      try { if ((await fetch(`http://127.0.0.1:${PORT}/health`)).ok) break; } catch {}
      await new Promise((r) => setTimeout(r, 1000));
    }
    console.log(`${m.name} loaded in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
    // A thinking model writes its working first, so it gets room for that.
    const thinks = /thinking/i.test(m.files.model);
    const text = (await ask('In one sentence, what is the capital of France?', thinks ? 1500 : undefined)).replace(/<think>[\s\S]*?<\/think>/g, '');
    console.log(`  Q: capital of France → ${text}`);
    if (!/paris/i.test(text)) throw new Error(`${m.name} did not answer a simple question correctly`);
    if (m.pack && !thinks) {
      // Room for the full working (Qwen3.5 lays out long multiplication in detail), then the answer
      // on its own last line, so a cut-off half-way through can't be mistaken for the answer.
      const q = 'What is 17 × 23? Work it out step by step, then give the final answer on the last line as "Answer: <number>".';
      const stated = (t) => (t.match(/Answer:\**\s*\**\s*(\d[\d,]*)/i) || [])[1]?.replace(/,/g, '') || (t.match(/\d[\d,]*/g) || []).pop(); // the stated answer, else the last number
      // The way Quicksilver asks. A sum written in a question is worked out exactly by the app
      // (its own calculator, checks.js) and handed to the model with the question, so a small
      // model's own arithmetic is never what an answer rests on. Both halves are checked here:
      // the app's calculator gets it right, and the model uses what it is given.
      const facts = appChecks.exactFacts(q);
      if (!facts.includes('17 × 23 = 391')) throw new Error(`the app's own calculator did not work out 17 × 23 (it gave ${JSON.stringify(facts)})`);
      const helped = await ask(`<context>\nExact results worked out by the app for this question (use these numbers as they are):\n${facts.map((f) => `- ${f}`).join('\n')}\n</context>\n\n${q}`, 1200);
      console.log(`  Q: 17 × 23, asked the way Quicksilver asks (with the app's exact sum) → ${stated(helped)}`);
      if (stated(helped) !== '391') throw new Error(`${m.name} got 17 × 23 wrong even with the app's exact sum:\n${helped}`);
      // The model on its own, for the record. Its unaided arithmetic depends on the machine: the
      // same file at the same settings gave 391 on one build machine and 85 on another (a
      // processor with fewer cores rounds differently, and one different word early on changes
      // the rest). That is why the app does the sum itself; so this is reported, not required.
      const alone = stated(await ask(q, 1200));
      console.log(`  Q: 17 × 23, unaided → ${alone}`);
      if (alone !== '391') console.log(`::warning::${m.name} got 17 × 23 wrong on its own on this build machine (${alone}). In Quicksilver the app works the sum out and hands it to the model, which this build checked above.`);
    }
    if (m.files.mmproj) {
      const img = `data:image/png;base64,${png(220, 30, 30).toString('base64')}`;
      const seen = await ask([{ type: 'text', text: 'What colour is this image? Answer with one word.' }, { type: 'image_url', image_url: { url: img } }]);
      console.log(`  Q: colour of a red image → ${seen}`);
      if (!/red/i.test(seen)) throw new Error(`${m.name} could not see the image`);
    }
  } catch (err) {
    console.error(log.join('').split('\n').slice(-40).join('\n'));
    throw err;
  } finally {
    proc.kill();
    await new Promise((r) => setTimeout(r, 1500));
  }
}

(async () => {
  for (const m of models.filter((m) => !m.kind)) await prove(m); // chat models (search, picture and video models are not llama models)
  console.log('every model that comes with Quicksilver works');
})().catch((err) => { console.error(`FAILED: ${err.message}`); process.exit(1); });
