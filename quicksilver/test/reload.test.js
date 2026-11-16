// A model must NOT be reloaded from disk as a chat gets longer. On a PC without much spare memory a
// chat used to outgrow the context the model was loaded with after a few messages, and Quicksilver
// would kill the engine and load the model again — so every message ran "like it was the first time".
// The model is now loaded at a steady context and the oldest turns are trimmed to fit, so the same
// engine keeps answering. This test reproduces a tight-memory PC and proves the engine starts once.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

process.env.QUICKSILVER_HOME = fs.mkdtempSync(path.join(os.tmpdir(), 'qs-reload-'));
process.env.QS_LLAMA_SERVER = path.join(__dirname, 'fakes', 'llama-server');
process.env.QS_SPAWN_LOG = path.join(process.env.QUICKSILVER_HOME, 'spawns.log');

const hardware = require('../src/main/hardware');
// Pretend this PC has little spare memory: no graphics card and only a few GB of RAM, so the model
// is loaded with the smallest "roomy" context (8K). This is exactly the case the bug showed up on.
hardware.detect = async () => ({ platform: 'linux', arch: 'x64', ramGB: 4, freeRamGB: 2, vramGB: 0, vramFreeGB: 0, gpus: [], cpu: 'Test CPU', cores: 4, nvidia: false, unifiedMemory: false, adapters: [] });

const llama = require('../src/main/llama');

const starts = () => (fs.existsSync(process.env.QS_SPAWN_LOG) ? fs.readFileSync(process.env.QS_SPAWN_LOG, 'utf8').split('\n').filter(Boolean).length : 0);

async function drain(model, messages) {
  let text = '';
  for await (const ev of llama.chat(model, { messages, maxTokens: 128, contextSize: 16384 })) {
    if (ev.type === 'text') text += ev.text;
  }
  return text;
}

(async () => {
  // A model with a large trained context (65K), like the real chat models — so a growing chat really
  // could ask for a bigger context than it was loaded with (tiny.gguf caps at 4K and can't show it).
  const BIG = path.join(__dirname, 'fixtures', 'tiny-bigctx.gguf');
  const model = { id: 't', name: 'Tiny', file: BIG };

  // First message: a short chat. The engine loads once.
  await drain(model, [{ role: 'system', content: 'You are helpful.' }, { role: 'user', content: 'Hello there.' }]);
  assert.equal(starts(), 1, 'the engine loads once for the first message');

  // Now the conversation grows well past what an 8K context holds — the old code would reload the
  // model here (and again on each later message). Build a long history and keep sending more.
  const history = [{ role: 'system', content: 'You are helpful.' }];
  for (let turn = 0; turn < 12; turn++) {
    history.push({ role: 'user', content: `Turn ${turn}: ` + 'tell me a long story about the sea. '.repeat(120) });
    history.push({ role: 'assistant', content: 'Here is a long reply. '.repeat(120) });
    await drain(model, history);
  }

  assert.equal(starts(), 1, 'the SAME engine answers every message — the model is never reloaded as the chat grows');

  llama.stopAll();
  await new Promise((r) => setTimeout(r, 300));
  console.log('✓ reload: a model stays loaded as a chat grows on a memory-tight PC (no reload per message)');
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
