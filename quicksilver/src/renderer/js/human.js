// Writes like a person, not a chatbot. Quicksilver's answers are conversational and clear, without
// the habits that make text read as AI-made (stock openers and sign-offs, "As an AI", em dashes
// everywhere, headings and bullet lists for everything, bold on every other phrase). The style is
// asked for up front; a light tidy afterwards removes the usual leftovers. Code, tables, quotes
// and anything you asked to be formatted are left alone. On by default; Settings can turn it off.
'use strict';

const humanOn = () => S.data?.prefs?.humanWriting !== false;

const HUMAN_STYLE = 'How to write: like a knowledgeable friend talking: warm, plain and direct, in natural paragraphs with everyday words and contractions. Start with the answer itself (no "Great question", "Certainly" or restating the question). No headings, bold or bullet lists unless the content is really steps or a list, or the user asks. No em dashes (—), no "as an AI", no disclaimers unless something is risky, no stock phrases (delve, it\'s worth noting, in conclusion, I hope this helps, feel free to). No emoji unless the user uses them. Stop when it\'s answered, without a summary or sign-off. Code goes in fenced blocks. A table always has a first column naming each row. Match the user\'s spelling, units and currency. Check any arithmetic.';

// Gentle clean-up of the usual chatbot leftovers, outside code blocks and tables.
function humanize(text) {
  if (!humanOn() || !text) return text;
  const parts = String(text).split(/(```[\s\S]*?```|`[^`\n]+`)/);
  const out = parts.map((p, i) => {
    if (i % 2 === 1) return p; // code
    return p.split('\n').map((line) => {
      if (/^\s*\|/.test(line) || /^\s*>/.test(line)) return line; // tables and quotes
      return line
        .replace(/\s+—\s+/g, ', ')
        .replace(/(\p{L})—(\p{L})/gu, '$1, $2')
        .replace(/\s*—\s*/g, ', ')
        .replace(/(^|\s)(✅|👉|✔️|➡️)\s*/gu, '$1')
        .replace(/\bAs an AI(?: language model| assistant| model)?,?\s*/gi, '')
        .replace(/\bI'm (just )?an AI(?: language model| assistant)?(,| and| so)?\s*/gi, '');
    }).join('\n');
  }).join('');
  return out
    .replace(/^\s*(?:Certainly|Absolutely|Of course|Sure thing|Sure|Great question|What a great question|Good question)[!.,:]+\s*/i, '')
    .replace(/(?:\n+\s*(?:I hope (?:this|that) helps|Hope (?:this|that) helps|Let me know if (?:you have|there's|you need|you'd like)|Feel free to (?:ask|reach out|let me know)|Happy to help|If you have any (?:other|more|further) questions)[^\n]*)+\s*$/i, '')
    .replace(/^(\p{Ll})/u, (c) => c.toUpperCase())
    .trim();
}
