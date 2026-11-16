// Derives tiny-bigctx.gguf from tiny.gguf by rewriting the model's trained context length to 65536.
// The stand-in engine (test/fakes/llama-server) ignores the weights, so the only thing this fixture
// changes is what readGguf reports — enough to test that a growing chat does not reload the model on
// a model with a real (large) context. Run: node test/fixtures/make-bigctx-gguf.js
const fs = require('fs');
const path = require('path');
const src = path.join(__dirname, 'tiny.gguf');
const dst = path.join(__dirname, 'tiny-bigctx.gguf');
const buf = fs.readFileSync(src);
const i = buf.indexOf(Buffer.from('llama.context_length'));
if (i < 0) throw new Error('context_length key not found in tiny.gguf');
const after = i + 'llama.context_length'.length;
if (buf.readUInt32LE(after) !== 4) throw new Error('unexpected value type (want UINT32)');
const out = Buffer.from(buf);
out.writeUInt32LE(65536, after + 4); // was 4096
fs.writeFileSync(dst, out);
console.log('wrote', dst, 'with context_length 65536');
