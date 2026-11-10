// User-submitted stacks: custom AIs (fusions) people built in Quicksilver and published for
// everyone. They live in quicksilver/data/community.json in the Quicksilver repository. People
// submit one from the app (it opens a ready-filled GitHub issue); after a maintainer approves it
// (the "approved" label), a GitHub Action adds it to the list, and every Quicksilver reads the
// list once a day. Nothing runs from it: it only names models and how they work together.
//
// A shared stack is portable: local models are named by their catalog id (so another PC can
// download them) and cloud AIs by service and model name (never anyone's keys).
'use strict';

const MODES = ['blend', 'debate', 'consensus', 'vote', 'redteam', 'plan', 'panel'];
const str = (v, max) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max) : '');

// Checks one stack; returns it cleaned, or throws with a reason a person can act on.
// known = { models: Set of catalog ids, presets: Set of cloud service ids }
function cleanStack(s, known) {
  if (!s || typeof s !== 'object') throw new Error('Not a stack.');
  const name = str(s.name, 60);
  if (name.length < 3) throw new Error('The name is missing or too short.');
  const description = str(s.description, 400);
  if (description.length < 20) throw new Error('Say in a sentence or two what it\'s good at.');
  const mode = MODES.includes(s.mode) ? s.mode : 'blend';
  const parts = (Array.isArray(s.parts) ? s.parts : []).slice(0, 4).map((p) => {
    if (p?.kind === 'local' && known.models.has(p.model)) return { kind: 'local', model: p.model };
    if (p?.kind === 'cloud' && known.presets.has(p.preset) && str(p.model, 80)) return { kind: 'cloud', preset: p.preset, model: str(p.model, 80) };
    throw new Error(`Unknown model: ${JSON.stringify(p).slice(0, 80)}. Only models from Quicksilver's catalog and its listed cloud AIs can be shared.`);
  });
  if (parts.length < 2) throw new Error('A stack needs 2 to 4 AIs.');
  const lead = Number.isInteger(s.lead) && s.lead >= 0 && s.lead < parts.length ? s.lead : 0;
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'stack';
  return { id: str(s.id, 60).replace(/[^a-z0-9-]/g, '') || slug, name, emoji: str(s.emoji, 4) || '⚗️', description, author: str(s.author, 40), mode, parts, lead, added: /^\d{4}-\d{2}-\d{2}$/.test(s.added || '') ? s.added : '' };
}

// The whole list (from the repository): bad entries are skipped, never fatal.
function cleanList(j, known) {
  if (!j || typeof j !== 'object' || j.version !== 1 || !Array.isArray(j.stacks)) return null;
  const out = [];
  for (const s of j.stacks.slice(0, 500)) { try { const c = cleanStack(s, known); if (!out.some((x) => x.id === c.id)) out.push(c); } catch {} }
  return { version: 1, stacks: out };
}

// The JSON block inside a submission issue.
function fromIssue(body) {
  const m = String(body || '').match(/```json\s*([\s\S]*?)```/);
  if (!m) throw new Error('No ```json block found in the issue.');
  return JSON.parse(m[1]);
}

module.exports = { MODES, cleanStack, cleanList, fromIssue };
