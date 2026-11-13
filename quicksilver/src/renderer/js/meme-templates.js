// Real meme templates for Meme battle: the formats people know, each with how its joke works, so
// any model (even a small one) only has to fill in the boxes well. Pictures come from Imgflip's
// public list of popular memes (fetched once, then kept on this PC). Box positions are fractions of
// the picture: [left, top, width, height].
'use strict';

const MEME_TEMPLATES = [
  { id: '181913649', name: 'Drake Hotline Bling', url: 'https://i.imgflip.com/30b1gx.jpg', how: 'Box 1: the thing Drake rejects. Box 2: the thing he prefers (the funnier, more specific choice).', boxes: [[0.5, 0.02, 0.48, 0.46], [0.5, 0.52, 0.48, 0.46]] },
  { id: '112126428', name: 'Distracted Boyfriend', url: 'https://i.imgflip.com/1ur9b0.jpg', how: 'Box 1: the tempting new thing (woman in red). Box 2: you / the person (boyfriend). Box 3: what you should be paying attention to (girlfriend).', boxes: [[0.04, 0.58, 0.34, 0.2], [0.42, 0.3, 0.28, 0.2], [0.68, 0.42, 0.3, 0.2]] },
  { id: '87743020', name: 'Two Buttons', url: 'https://i.imgflip.com/1g8my4.jpg', how: 'Box 1 and 2: two options that are equally tempting or contradictory. Box 3: who has to choose (sweating).', boxes: [[0.08, 0.08, 0.3, 0.14], [0.4, 0.04, 0.3, 0.14], [0.05, 0.78, 0.9, 0.2]] },
  { id: '129242436', name: 'Change My Mind', url: 'https://i.imgflip.com/24y43o.jpg', how: 'Box 1: a bold, slightly ridiculous opinion written on the sign.', boxes: [[0.3, 0.6, 0.42, 0.22]] },
  { id: '93895088', name: 'Expanding Brain', url: 'https://i.imgflip.com/1jwhww.jpg', how: 'Boxes 1 to 4: four takes on the topic, each "smarter" than the last, where the last is absurdly over the top.', boxes: [[0.02, 0.02, 0.46, 0.21], [0.02, 0.27, 0.46, 0.21], [0.02, 0.52, 0.46, 0.21], [0.02, 0.77, 0.46, 0.21]] },
  { id: '124822590', name: 'Left Exit 12 Off Ramp', url: 'https://i.imgflip.com/22bdq6.jpg', how: 'Box 1: the sensible way straight on. Box 2: the tempting exit. Box 3: who swerves onto the exit (the car).', boxes: [[0.2, 0.08, 0.24, 0.2], [0.47, 0.08, 0.26, 0.2], [0.3, 0.72, 0.4, 0.2]] },
  { id: '188390779', name: 'Woman Yelling At Cat', url: 'https://i.imgflip.com/345v97.jpg', how: 'Box 1: an angry, dramatic accusation. Box 2: the cat\'s calm, unbothered reply.', boxes: [[0.01, 0.02, 0.48, 0.22], [0.51, 0.02, 0.48, 0.22]] },
  { id: '131940431', name: 'Gru\'s Plan', url: 'https://i.imgflip.com/26jxvz.jpg', how: 'Boxes 1 to 3: the steps of a plan. Box 4: the same as box 3, the step that backfires (Gru realizes).', boxes: [[0.26, 0.1, 0.21, 0.3], [0.76, 0.1, 0.21, 0.3], [0.26, 0.6, 0.21, 0.3], [0.76, 0.6, 0.21, 0.3]] },
  { id: '247375501', name: 'Buff Doge vs. Cheems', url: 'https://i.imgflip.com/43a45p.png', how: 'Box 1: the strong past version. Box 2: the weak present version. Box 3: what the strong one says. Box 4: what the weak one says (whiny).', boxes: [[0.03, 0.02, 0.44, 0.12], [0.53, 0.02, 0.44, 0.12], [0.03, 0.78, 0.44, 0.2], [0.53, 0.78, 0.44, 0.2]] },
  { id: '217743513', name: 'UNO Draw 25 Cards', url: 'https://i.imgflip.com/3lmzyx.jpg', how: 'Box 1: something simple someone refuses to do (on the card). Box 2: who would rather draw 25 cards.', boxes: [[0.1, 0.3, 0.32, 0.28], [0.52, 0.8, 0.46, 0.18]] },
  { id: '100777631', name: 'Is This A Pigeon', url: 'https://i.imgflip.com/1o00in.jpg', how: 'Box 1: who is confused (the man). Box 2: the thing they misread (the butterfly). Box 3: their wrong question ("Is this …?").', boxes: [[0.08, 0.5, 0.34, 0.16], [0.58, 0.12, 0.38, 0.16], [0.02, 0.8, 0.96, 0.18]] },
  { id: '438680', name: 'Batman Slapping Robin', url: 'https://i.imgflip.com/9ehk.jpg', how: 'Box 1: what Robin starts to say (a bad take). Box 2: Batman\'s cutting reply.', boxes: [[0.02, 0.02, 0.46, 0.22], [0.52, 0.02, 0.46, 0.22]] },
  { id: '55311130', name: 'This Is Fine', url: 'https://i.imgflip.com/wxica.jpg', top: true, how: 'Top: the disaster that is happening. Bottom: the calm denial ("this is fine" in your own words).' },
  { id: '27813981', name: 'Hide the Pain Harold', url: 'https://i.imgflip.com/gk5el.jpg', top: true, how: 'Top: a situation that hurts. Bottom: smiling through it anyway.' },
  { id: '89370399', name: 'Roll Safe Think About It', url: 'https://i.imgflip.com/1h7in3.jpg', top: true, how: 'Top and bottom: "clever" life advice that is obviously terrible logic.' },
  { id: '61544', name: 'Success Kid', url: 'https://i.imgflip.com/1bhk.jpg', top: true, how: 'Top: a small everyday situation. Bottom: the tiny, very specific win.' },
  { id: '61579', name: 'One Does Not Simply', url: 'https://i.imgflip.com/1bij.jpg', top: true, how: 'Top: "One does not simply". Bottom: an everyday thing that is surprisingly hard.' },
  { id: '97984', name: 'Disaster Girl', url: 'https://i.imgflip.com/23ls.jpg', top: true, how: 'Top: the chaos behind her. Bottom: her smug admission that she caused it.' },
  { id: '4087833', name: 'Waiting Skeleton', url: 'https://i.imgflip.com/2fm6x.jpg', top: true, how: 'Top: what you are waiting for. Bottom: how long (absurdly long).' },
  { id: '222403160', name: 'Bernie I Am Once Again Asking', url: 'https://i.imgflip.com/3oevdk.jpg', top: true, how: 'Top: "I am once again asking". Bottom: a petty, specific request.' },
];

// The instructions every model gets: how memes work, the formats to choose from, and to brainstorm
// three jokes before committing to the funniest.
function memeSystemPrompt({ topBottomOnly = false } = {}) {
  const list = MEME_TEMPLATES.filter((t) => !topBottomOnly || t.top).map((t) => `- ${t.name} (${t.top ? '2 boxes: top, bottom' : `${t.boxes.length} boxes`}): ${t.how}`).join('\n');
  return `You are a sharp, funny meme writer. Make a meme about the user's topic using one of these well-known meme formats:
${list}

What makes a meme funny:
- Specific and relatable beats general: a real, small, recognisable moment ("the printer jams the second you're late") not a vague idea ("printers are bad").
- Use the format's joke exactly as it works (see each one's note); the picture does half the work.
- Exaggerate, or twist the ending: the last box is the punchline and should surprise.
- Short: under 9 words a box. No explaining the joke, no hashtags, no emoji.

First, in a short list, write three different meme ideas for the topic, each with a different format. Then choose the funniest and give it LAST, as ONLY a JSON object on its own:
{"template": "exact format name from the list", "boxes": ["text for box 1", "text for box 2", "..."]}
The number of boxes must match the format.`;
}

const memeTemplateByName = (name) => {
  const n = String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  return MEME_TEMPLATES.find((t) => t.name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim() === n)
    || MEME_TEMPLATES.find((t) => n && (t.name.toLowerCase().includes(n) || n.includes(t.name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').split(' ').slice(0, 2).join(' '))));
};
