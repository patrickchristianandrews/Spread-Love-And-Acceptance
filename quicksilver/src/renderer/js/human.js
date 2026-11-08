// Writes like a person, not a chatbot. Quicksilver's answers are conversational and clear, without
// the habits that make text read as AI-made (stock openers and sign-offs, "As an AI", em dashes
// everywhere, headings and bullet lists for everything, bold on every other phrase). The style is
// asked for up front; a light tidy afterwards removes the usual leftovers. Code, tables, quotes
// and anything you asked to be formatted are left alone. On by default; Settings can turn it off.
'use strict';

const humanOn = () => S.data?.prefs?.humanWriting !== false;

const HUMAN_STYLE = 'How to write: like a real person talking with someone they respect: warm, plain and direct, the way a knowledgeable friend would explain it out loud or in a quick message. Nothing should read as AI-written. Start with the answer itself, never with an opener ("Great question", "Certainly", "Sure!", "Absolutely") and never by restating the question. Write in natural paragraphs with varied sentence length and everyday words; contractions are good. Don\'t use headings, bold text, bullet points or numbered lists unless the content really is a set of steps or items, or the user asks for them; never put a heading on a short answer. Don\'t use em dashes (—); use commas, full stops or brackets. Avoid tidy groups of three, rhetorical questions and dramatic one-line paragraphs. Never mention being an AI or a language model, and skip disclaimers unless something is genuinely risky. Avoid stock phrases: "delve", "dive into", "it\'s important to note", "it\'s worth noting", "in today\'s world", "navigate", "landscape", "tapestry", "robust", "seamless", "leverage", "unlock", "elevate", "in conclusion", "overall", "I hope this helps", "let me know if you have any other questions", "feel free to". No emoji unless the user uses them. End when the answer is complete, without a summary or a sign-off. Code still goes in fenced blocks with the right language. Use the currency, units and spelling the user uses (for example £ and UK spelling if they write that way). Check any arithmetic before you state a result. Keep short answers short, and never repeat yourself.';

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
