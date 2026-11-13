// Smarter search for Your knowledge: Nomic Embed v1.5, a small model (about 0.15 GB) that turns
// text into "meaning vectors" on this PC. Passages are found by what they mean, not only by the
// words they share with the question; keyword search still runs alongside and the two are merged.
// Optional: without it, knowledge search uses keywords alone (as before).
const llama = require('./llama');
const models = require('./models');

const EMBED = {
  id: 'nomic-embed-v1.5', name: 'Nomic Embed v1.5 (smarter search)', repo: 'nomic-ai/nomic-embed-text-v1.5-GGUF',
  alt: ['second-state/Nomic-embed-text-v1.5-Embedding-GGUF'], quant: 'Q8_0', sizeGB: 0.15, verify: true,
};

const installed = () => models.list().find((m) => m.kind === 'embed');

// Vectors for a batch of texts. Nomic needs a task prefix: documents and questions differ.
async function embed(texts, kind = 'document') {
  const m = installed();
  if (!m || !texts.length) return null;
  const s = await llama.ensure({ id: m.id, name: m.name, file: m.files.model, embedding: true }, { contextSize: 2048, gpu: 'auto' });
  const prefix = kind === 'query' ? 'search_query: ' : 'search_document: ';
  const res = await fetch(`http://127.0.0.1:${s.port}/v1/embeddings`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(120000),
    body: JSON.stringify({ input: texts.map((t) => prefix + String(t).slice(0, 1800)) }),
  });
  if (!res.ok) throw new Error(`The search model returned HTTP ${res.status}`);
  const j = await res.json();
  return (j.data || []).sort((a, b) => a.index - b.index).map((d) => normalize(d.embedding));
}
function normalize(v) {
  let n = 0;
  for (const x of v) n += x * x;
  n = Math.sqrt(n) || 1;
  return v.map((x) => Math.round((x / n) * 10000) / 10000);
}
const cosine = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; };

module.exports = { EMBED, installed, embed, cosine };
