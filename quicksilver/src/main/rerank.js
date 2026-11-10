// Sharper search for Your knowledge: a small reranker (BGE Reranker v2 M3, about 0.44 GB) reads the
// question together with each candidate passage and scores how well it actually answers it. Search
// finds the candidates (keywords and meaning); the reranker puts the best ones first, so the model
// reads the right passages. Optional: without it, search order is used as before.
const llama = require('./llama');
const models = require('./models');

const RERANK = {
  id: 'bge-reranker-v2-m3', name: 'BGE Reranker v2 M3 (sharper search)', repo: 'gpustack/bge-reranker-v2-m3-GGUF',
  alt: ['sabafallah/bge-reranker-v2-m3-Q4_K_M-GGUF'], quant: 'Q4_K_M', sizeGB: 0.44, verify: true,
};

const installed = () => models.list().find((m) => m.kind === 'rerank');

// Scores for each document against the query (higher is better), or null if not available.
async function rerank(query, docs) {
  const m = installed();
  if (!m || !docs.length) return null;
  const s = await llama.ensure({ id: m.id, name: m.name, file: m.files.model, rerank: true }, { contextSize: 4096, gpu: 'auto' });
  const body = JSON.stringify({ query: String(query).slice(0, 1000), documents: docs.map((d) => String(d).slice(0, 1800)), top_n: docs.length });
  for (const path of ['/v1/rerank', '/rerank']) {
    const res = await fetch(`http://127.0.0.1:${s.port}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, signal: AbortSignal.timeout(60000) }).catch(() => null);
    if (!res?.ok) continue;
    const j = await res.json();
    const scores = new Array(docs.length).fill(-Infinity);
    for (const r of j.results || j.data || []) scores[r.index] = r.relevance_score ?? r.score ?? -Infinity;
    return scores;
  }
  return null;
}

module.exports = { RERANK, installed, rerank };
