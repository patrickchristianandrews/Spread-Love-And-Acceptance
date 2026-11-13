// Writes like a person, not a chatbot. Quicksilver's answers are conversational and clear, without
// the habits that make text read as AI-made (stock openers and sign-offs, "As an AI", em dashes
// everywhere, headings and bullet lists for everything, bold on every other phrase). The style is
// asked for up front; a light tidy afterwards removes the usual leftovers. Code, tables, quotes
// and anything you asked to be formatted are left alone. On by default; Settings can turn it off.
'use strict';

const humanOn = () => S.data?.prefs?.humanWriting !== false;

// The rules every answer follows, whichever style is on (Settings → Writing style adds to them).
const DIRECT_RULES = 'Rules for every answer: the first words are the answer itself, never an acknowledgement (no "Certainly", "Sure", "Great question", "Absolutely", "Of course"). Never say "As an AI", "As a language model" or "I don\'t have feelings", and add no AI or accuracy disclaimers. No hedges ("it\'s important to note", "it\'s worth noting", "generally speaking", "in most cases", "typically"). At most one caveat, and only when it changes the answer. Never "I\'m not sure, but": answer, or name the specific thing you don\'t know. Give opinions plainly, without softening. End when it\'s answered: no "I hope this helps", "Let me know if you\'d like", "Feel free to ask" or offers of more help. No emoji unless asked. Bold only the one or two things that matter most. Markdown only when the structure helps.';

const HUMAN_STYLE = 'How to write: like a knowledgeable friend talking: warm, plain and direct, in natural paragraphs with everyday words and contractions. Start with the answer itself (no "Great question", "Certainly" or restating the question). No headings, bold or bullet lists unless the content is really steps or a list, or the user asks. No em dashes (—), no "as an AI", no disclaimers unless something is risky, no stock phrases (delve, it\'s worth noting, in conclusion, I hope this helps, feel free to). No emoji unless the user uses them. Stop when it\'s answered, without a summary or sign-off. Code goes in fenced blocks. A table always has a first column naming each row. Match the user\'s spelling, units and currency. Check any arithmetic.';

// ---------- Writing style (Settings → Writing style) ----------
// Base style and tone, warmth, enthusiasm, emoji, visual answers, headers and lists. "Default"
// leaves Quicksilver's own style alone; the others add a line to every chat's instructions.
const STYLE_OPTIONS = {
  styleBase: { label: 'Base style and tone', options: [['', 'Default'], ['professional', 'Professional'], ['friendly', 'Friendly'], ['candid', 'Candid'], ['quirky', 'Quirky'], ['efficient', 'Efficient'], ['nerdy', 'Nerdy'], ['cynical', 'Cynical']],
    say: { professional: 'Tone: polished and precise, like a trusted professional; courteous, no slang.', friendly: 'Tone: warm and easygoing, like a good friend who knows the subject.', candid: 'Tone: candid and direct; say plainly what you think, including when the user is wrong, kindly.', quirky: 'Tone: playful and imaginative, with light humor and unexpected comparisons, while staying useful.', efficient: 'Tone: efficient; the shortest answer that fully works, no preamble, no extras.', nerdy: 'Tone: curious and enthusiastic about ideas; explain how things work, with the interesting details.', cynical: 'Tone: dry and sardonic, with a skeptical wit, but still genuinely helpful and accurate.' } },
  styleWarmth: { label: 'Warmth', options: [['', 'Default'], ['more', 'More'], ['less', 'Less']], say: { more: 'Be extra warm and encouraging; acknowledge feelings where it fits.', less: 'Keep it neutral and matter-of-fact; no reassurance or pleasantries.' } },
  styleEnthusiasm: { label: 'Enthusiasm', options: [['', 'Default'], ['more', 'More'], ['less', 'Less']], say: { more: 'Show energy and enthusiasm.', less: 'Keep the energy low-key and calm; no exclamation marks.' } },
  styleEmoji: { label: 'Emoji', options: [['', 'Default'], ['more', 'More'], ['less', 'Less'], ['none', 'None']], say: { more: 'Use emoji freely where they add color.', less: 'Use emoji rarely.', none: 'Never use emoji.' } },
  styleVisual: { label: 'Visual answers', options: [['', 'Default'], ['more', 'More'], ['less', 'Less']], say: { more: 'Prefer visual answers where they help: tables for comparisons, step-by-step numbered lists, diagrams as Mermaid code blocks, and charts.', less: 'Answer in prose; avoid tables and diagrams unless asked.' } },
  styleHeaders: { label: 'Headers and lists', options: [['', 'Default'], ['more', 'More'], ['less', 'Less']], say: { more: 'Organize longer answers with short headers and bullet lists so they are easy to scan.', less: 'Avoid headers and bullet lists; write in paragraphs.' } },
};
const styleOf = (k) => S.data?.prefs?.[k] || '';
// The chosen style, as lines for the instructions (empty when everything is Default).
function styleLines() {
  return Object.entries(STYLE_OPTIONS).map(([k, o]) => o.say[styleOf(k)]).filter(Boolean).join(' ');
}
// Quicksilver's own way of writing, adjusted where you chose otherwise (emoji, headers and lists).
function humanStyleText() {
  let t = `${HUMAN_STYLE} ${DIRECT_RULES}`;
  if (['more', 'less'].includes(styleOf('styleEmoji'))) t = t.replace(/ No emoji unless the user uses them\./, '');
  if (styleOf('styleHeaders') === 'more' || styleOf('styleVisual') === 'more') t = t.replace(/ No headings, bold or bullet lists unless the content is really steps or a list, or the user asks\./, '');
  if (styleOf('styleWarmth') === 'less' || ['professional', 'efficient', 'cynical'].includes(styleOf('styleBase'))) t = t.replace('warm, plain and direct', 'plain and direct');
  return t;
}

// Removes chatbot filler from any answer: openers, "As an AI", stock hedges and sign-offs.
// Code blocks are left alone.
const OPENER_RE = /^\s*(?:Certainly|Absolutely|Of course|Sure thing|Sure|Great question|What a great question|Good question)(?:\s*[!.,:—-]+\s*|\s+(?=[—-]))/i;
const CLOSER_RE = /(?:\n+\s*(?:I hope (?:this|that) helps|Hope (?:this|that) helps|Let me know if (?:you have|there's|you need|you'd like|you want)|Feel free to (?:ask|reach out|let me know)|Happy to help|If you have any (?:other|more|further) questions|Would you like me to [^\n]*\?\s*$|Want me to [^\n]*\?\s*$)[^\n]*)+\s*$/i;
function stripFiller(text) {
  if (!text) return text;
  const parts = String(text).split(/(```[\s\S]*?```|`[^`\n]+`)/);
  const out = parts.map((p, i) => (i % 2 === 1 ? p : p
    .replace(/\bAs an AI(?: language model| assistant| model)?,?\s*/gi, '')
    .replace(/\bAs a (?:large )?language model,?\s*/gi, '')
    .replace(/\bI(?: don't|'m not able to| do not) (?:have|experience) (?:personal )?(?:feelings|emotions|opinions)[^.!?\n]*[.!?]\s*/gi, '')
    .replace(/\bI'm not (?:entirely |completely |100% )?sure,? but\s*/gi, '')
    .replace(/\b(?:It's|It is) (?:important|worth) (?:to note|noting) that\s+(\p{L})/giu, (m, c) => c.toUpperCase())
    .replace(/\bGenerally speaking,\s*(\p{L})/giu, (m, c) => c.toUpperCase())
  )).join('');
  return out.replace(OPENER_RE, '').replace(CLOSER_RE, '').replace(/^(\p{Ll})/u, (c) => c.toUpperCase()).trim();
}

// Gentle clean-up of the usual chatbot leftovers, outside code blocks and tables.
function humanize(text) {
  if (!text) return text;
  if (!humanOn()) return stripFiller(text);
  const parts = String(text).split(/(```[\s\S]*?```|`[^`\n]+`)/);
  const out = parts.map((p, i) => {
    if (i % 2 === 1) return p; // code
    return p.split('\n').map((line) => {
      if (/^\s*\|/.test(line) || /^\s*>/.test(line)) return line; // tables and quotes
      return line
        .replace(/\s+—\s+/g, ', ')
        .replace(/(\p{L})—(\p{L})/gu, '$1, $2')
        .replace(/\s*—\s*/g, ', ')
        .replace(styleOf('styleEmoji') === 'more' ? /$^/u : /(^|\s)(✅|👉|✔️|➡️)\s*/gu, '$1')
        .replace(/\bAs an AI(?: language model| assistant| model)?,?\s*/gi, '')
        .replace(/\bI'm (just )?an AI(?: language model| assistant)?(,| and| so)?\s*/gi, '');
    }).join('\n');
  }).join('');
  return stripFiller(out);
}
