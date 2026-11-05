// Proves the bundled starter model really works with the real engine before it ships:
// loads it on the processor (like the slowest PC would), asks a question, and (when it can see)
// shows it a picture and asks what colour it is.
// Usage: node scripts/prove-starter.js <path to llama-server>
const path = require('node:path');
const fs = require('node:fs');
const zlib = require('node:zlib');
const { spawn } = require('node:child_process');

const server = process.argv[2];
const dir = path.join(__dirname, '..', 'starter');
const meta = JSON.parse(fs.readFileSync(path.join(dir, 'STARTER.json'), 'utf8'));
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

async function ask(content) {
  const res = await fetch(`http://127.0.0.1:${PORT}/v1/chat/completions`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: [{ role: 'user', content }], max_tokens: 60, temperature: 0 }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  const j = await res.json();
  return j.choices[0].message.content.trim();
}

(async () => {
  const args = ['-m', path.join(dir, meta.files.model), '--host', '127.0.0.1', '--port', String(PORT), '-c', '4096', '-ngl', '0', '--device', 'none', '--jinja', '--cache-reuse', '256'];
  if (meta.files.mmproj) args.push('--mmproj', path.join(dir, meta.files.mmproj));
  const log = [];
  const proc = spawn(server, args, { windowsHide: true });
  proc.stdout.on('data', (d) => log.push(String(d)));
  proc.stderr.on('data', (d) => log.push(String(d)));
  let exited = false; proc.on('exit', () => { exited = true; });
  try {
    const t0 = Date.now();
    for (;;) {
      if (exited) throw new Error('the engine stopped while loading the starter model');
      if (Date.now() - t0 > 300000) throw new Error('the starter model took too long to load');
      try { if ((await fetch(`http://127.0.0.1:${PORT}/health`)).ok) break; } catch {}
      await new Promise((r) => setTimeout(r, 1000));
    }
    console.log(`${meta.name} loaded in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
    const text = await ask('In one sentence, what is the capital of France?');
    console.log(`Q: capital of France → ${text}`);
    if (!/paris/i.test(text)) throw new Error('the starter model did not answer a simple question correctly');
    if (meta.files.mmproj) {
      const img = `data:image/png;base64,${png(220, 30, 30).toString('base64')}`;
      const seen = await ask([{ type: 'text', text: 'What colour is this image? Answer with one word.' }, { type: 'image_url', image_url: { url: img } }]);
      console.log(`Q: colour of a red image → ${seen}`);
      if (!/red/i.test(seen)) throw new Error('the starter model could not see the image');
    }
    console.log('starter model works');
  } catch (err) {
    console.error(log.join('').split('\n').slice(-40).join('\n'));
    console.error(`FAILED: ${err.message}`);
    process.exitCode = 1;
  } finally {
    proc.kill();
  }
})();
