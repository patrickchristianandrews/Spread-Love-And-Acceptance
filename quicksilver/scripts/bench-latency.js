// Where the time goes: five questions in a row in one chat, through Quicksilver's own answer path
// (the same code the app uses), with a real llama-server and a real model. Prints a table.
//
//   node scripts/bench-latency.js <model.gguf> [llama-server path]
//
// Columns: "before send" is everything before the request leaves (starting the engine and loading
// the model, routing); "first byte" is the engine reading the prompt until the first word comes
// back; "prompt eval" and "generation" are the engine's own timings; "reused" is how many prompt
// tokens came from the cache instead of being read again.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const [modelFile, server] = process.argv.slice(2);
if (!modelFile || !fs.existsSync(modelFile)) { console.error('Usage: node scripts/bench-latency.js <model.gguf> [llama-server]'); process.exit(2); }
if (server) process.env.QS_LLAMA_SERVER = server;
process.env.QUICKSILVER_HOME ||= fs.mkdtempSync(path.join(os.tmpdir(), 'qs-bench-'));
const models = require('../src/main/models');
const complete = require('../src/main/complete');
const netlog = require('../src/main/netlog');
const llama = require('../src/main/llama');

(async () => {
  const realLog = console.log; console.log = () => {}; // keep the table readable
  models.add({ id: 'bench', name: path.basename(modelFile), kind: 'text', files: { model: path.resolve(modelFile) }, size: fs.statSync(modelFile).size, source: 'local' });
  const questions = ['What is a lumen?', 'And a candela?', 'Which matters more for a desk lamp?', 'What is a good number for reading?', 'Summarize that in one sentence.'];
  const messages = [];
  const rows = [];
  for (const [i, q] of questions.entries()) {
    messages.push({ role: 'user', content: q });
    const before = netlog.recent.length;
    const t0 = Date.now();
    let text = '';
    for await (const ev of complete.run('local:bench', { messages: messages.slice(), maxTokens: 120, contextSize: 4096, level: 'quick' })) if (ev.type === 'text') text += ev.text;
    const wall = Date.now() - t0;
    const req = netlog.recent.slice(before).filter((e) => e.timing && e.timing.totalMs != null).pop() || { timing: {} };
    messages.push({ role: 'assistant', content: text });
    const t = req.timing;
    rows.push({ '#': i + 1, 'before send ms': wall - (t.totalMs ?? wall), 'first byte ms': t.ttfbMs, 'prompt eval ms': t.promptMs, 'generation ms': t.evalMs, reused: t.cachedTokens ?? '', 'total ms': wall });
  }
  console.log = realLog;
  console.table(rows);
  const load = rows.map((r) => r['before send ms']);
  console.log(`before send: first ${load[0]} ms (cold start), then ${load.slice(1).join(', ')} ms`);
  await llama.stopAll?.();
  process.exit(0);
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
