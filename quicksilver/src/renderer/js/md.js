// Markdown for answers: headings, paragraphs, numbered and bulleted lists (kept together across
// blank lines, nested by indent, numbered from where they start), task lists, quotes, tables,
// code with syntax colours, charts, links and inline styles. Text is escaped first, so models
// can't inject HTML.
'use strict';

function inlineMd(s) {
  return s
    .replace(/`([^`]+)`/g, (_, c) => `<code>${c}</code>`)
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    .replace(/(^|[^*\w])\*([^*\s][^*]*?)\*(?!\w)/g, '$1<em>$2</em>')
    .replace(/(^|[\s(>])_([^_\s][^_]*?)_(?=[\s.,;:!?)<]|$)/g, '$1<em>$2</em>')
    .replace(/~~(.+?)~~/g, '<del>$1</del>')
    .replace(/==(.+?)==/g, '<mark>$1</mark>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/(^|[\s(])(https?:\/\/[^\s<)]+[^\s<).,;:!?])/g, '$1<a href="$2" target="_blank" rel="noopener">$2</a>')
    .replace(/\[(\d{1,2})\](?!\()/g, '<span class="cite" title="Source $1">$1</span>');
}

function tableHtml(lines) {
  const cells = (l) => l.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map((c) => c.trim());
  const head = cells(lines[0]);
  const align = cells(lines[1]).map((c) => (/^:-+:$/.test(c) ? 'center' : /-+:$/.test(c) ? 'right' : ''));
  const rows = lines.slice(2).map(cells);
  const id = `t${uid()}`;
  tableHtml.store[id] = [head, ...rows].map((r) => r.map((c) => c.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\*\*/g, '')));
  const al = (i) => (align[i] ? ` style="text-align:${align[i]}"` : '');
  return `<div class="table-wrap"><div class="table-tools"><button class="tool" data-table="${id}" data-fmt="copy" title="Copy the table">Copy</button><button class="tool" data-table="${id}" data-fmt="csv" title="Save as a CSV file">CSV</button><button class="tool" data-table="${id}" data-fmt="xlsx" title="Save as an Excel workbook">Excel</button></div>
    <table><thead><tr>${head.map((h, i) => `<th${al(i)}>${inlineMd(h)}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${head.map((_, i) => `<td${al(i)}>${inlineMd(r[i] || '')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
tableHtml.store = {};

// ---------- syntax colours (light, dependency-free) ----------

const HL_KEYWORDS = new Set(('if else elif for while do return function def class import from export default const let var new try catch except finally '
  + 'throw raise async await yield in of not and or is None True False null true false undefined this self super public private protected static '
  + 'void int long float double bool boolean string char struct enum interface type extends implements package namespace using fn pub mut impl '
  + 'match case switch break continue pass lambda with as goto go defer select func chan map range where echo print').split(' '));
const SQL_KEYWORDS = new Set(('select from where join left right inner outer on group by order having limit insert into values update set delete create '
  + 'table drop alter index view and or not null is as distinct union all case when then else end count sum avg min max like in between').split(' '));
const HASH_COMMENTS = /^(py|python|sh|bash|shell|zsh|ps1|powershell|r|ruby|rb|yaml|yml|toml|perl|make|dockerfile|ini|conf)$/i;
const DASH_COMMENTS = /^(sql|lua|haskell|hs)$/i;

function highlight(code, lang) {
  const l = String(lang || '').toLowerCase();
  if (/^(text|plain|txt|output|console|log|csv|md|markdown)$/.test(l)) return esc(code);
  const comment = HASH_COMMENTS.test(l) ? '#[^\\n]*' : DASH_COMMENTS.test(l) ? '--[^\\n]*' : '\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/|<!--[\\s\\S]*?-->';
  const re = new RegExp(`(${comment})|("(?:[^"\\\\\\n]|\\\\.)*"|'(?:[^'\\\\\\n]|\\\\.)*'|\`(?:[^\`\\\\]|\\\\.)*\`)|(\\b\\d+(?:[._]\\d+)*(?:e[+-]?\\d+)?\\b)|([A-Za-z_$][\\w$]*)(\\s*\\()?`, 'g');
  const sql = /^(sql|mysql|postgres|postgresql|sqlite)$/.test(l);
  let out = '';
  let last = 0;
  for (let m; (m = re.exec(code));) {
    out += esc(code.slice(last, m.index));
    last = re.lastIndex;
    if (m[1]) out += `<span class="hl-c">${esc(m[1])}</span>`;
    else if (m[2]) out += `<span class="hl-s">${esc(m[2])}</span>`;
    else if (m[3]) out += `<span class="hl-n">${esc(m[3])}</span>`;
    else if (m[4]) {
      const w = m[4];
      const kw = sql ? SQL_KEYWORDS.has(w.toLowerCase()) : HL_KEYWORDS.has(w);
      out += kw ? `<span class="hl-k">${esc(w)}</span>` : m[5] ? `<span class="hl-f">${esc(w)}</span>` : esc(w);
      if (m[5]) out += esc(m[5]);
    }
  }
  return out + esc(code.slice(last));
}

// ---------- blocks ----------

const LIST_RE = /^(\s*)([-*+•]|(\d+)[.)])\s+(.*)$/;
const TABLE_ROW = /^\s*\|.*\|\s*$/;
const TABLE_SEP = /^\s*\|?\s*:?-{2,}/;

function renderBlocks(text) {
  const lines = esc(text).split('\n');
  const out = [];
  let para = [];
  let quote = [];
  let stack = [];
  const flushPara = () => { if (para.length) { out.push(`<p>${inlineMd(para.join('<br>'))}</p>`); para = []; } };
  const flushQuote = () => { if (quote.length) { out.push(`<blockquote>${renderBlocks(quote.join('\n').replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&'))}</blockquote>`); quote = []; } };
  const listHTML = (l) => `<${l.tag}${l.tag === 'ol' && l.start !== 1 ? ` start="${l.start}"` : ''}${l.items.some((it) => it.task != null) ? ' class="tasks"' : ''}>${l.items.map((it) => `<li${it.task != null ? ` class="task${it.task ? ' done' : ''}"` : ''}>${it.task != null ? `<span class="tick">${it.task ? '✓' : ''}</span>` : ''}${inlineMd(it.text)}${it.extra.length ? `<p>${inlineMd(it.extra.join('<br>'))}</p>` : ''}${it.children.map(listHTML).join('')}</li>`).join('')}</${l.tag}>`;
  const flushList = () => { if (stack.length) { out.push(listHTML(stack[0])); stack = []; } };
  const item = (m) => {
    let t = m[4];
    let task = null;
    const tm = t.match(/^\[([ xX])\]\s+(.*)$/);
    if (tm) { task = tm[1] !== ' '; t = tm[2]; }
    return { text: t, task, extra: [], children: [] };
  };
  const newList = (m, indent) => ({ tag: m[3] ? 'ol' : 'ul', start: m[3] ? Number(m[3]) : 1, indent, items: [item(m)] });
  const width = (s) => s.replace(/\t/g, '    ').length;

  for (let k = 0; k < lines.length; k++) {
    const line = lines[k];
    if (!line.trim()) { flushPara(); flushQuote(); continue; }
    const li = line.match(LIST_RE);
    const isHr = /^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line);
    if (stack.length && !isHr) {
      if (li) {
        const indent = width(li[1]);
        while (stack.length > 1 && indent < stack[stack.length - 1].indent) stack.pop();
        const cur = stack[stack.length - 1];
        if (indent >= cur.indent + 2) { const child = newList(li, indent); cur.items[cur.items.length - 1].children.push(child); stack.push(child); continue; }
        if ((li[3] ? 'ol' : 'ul') === cur.tag || stack.length > 1) { cur.items.push(item(li)); continue; }
        flushList();
      } else if (/^\s{2,}\S/.test(line) && !/^\s*(#{1,6}\s|&gt;|\|)/.test(line)) {
        stack[stack.length - 1].items.slice(-1)[0].extra.push(line.trim());
        continue;
      } else flushList();
    }
    if (TABLE_ROW.test(line) && TABLE_SEP.test(lines[k + 1] || '')) {
      flushPara(); flushQuote();
      const tl = [line, lines[++k]];
      while (k + 1 < lines.length && TABLE_ROW.test(lines[k + 1])) tl.push(lines[++k]);
      out.push(tableHtml(tl));
      continue;
    }
    let m;
    if ((m = line.match(/^\s*(#{1,6})\s+(.*?)\s*#*\s*$/))) { flushPara(); flushQuote(); const n = Math.min(4, m[1].length); out.push(`<h${n}>${inlineMd(m[2])}</h${n}>`); continue; }
    if (isHr) { flushPara(); flushQuote(); flushList(); out.push('<hr>'); continue; }
    if ((m = line.match(/^\s*&gt;\s?(.*)/))) { flushPara(); quote.push(m[1]); continue; }
    flushQuote();
    if (li) { flushPara(); stack = [newList(li, width(li[1]))]; continue; }
    para.push(line.trim());
  }
  flushPara(); flushQuote(); flushList();
  return out.join('');
}

function markdown(text) {
  const out = [];
  const maths = [];
  String(text).split(/```/).forEach((part, i) => {
    if (i % 2 === 1) {
      const nl = part.indexOf('\n');
      const lang = nl >= 0 ? part.slice(0, nl).trim() : '';
      const code = (nl >= 0 ? part.slice(nl + 1) : part).replace(/\n$/, '');
      if (lang === 'chart') { const c = chartHTML(code); if (c) { out.push(c); return; } }
      const previewable = /^(html?|svg|xml)$/i.test(lang) && /<(html|body|div|svg|section|main|h1|canvas|style|!doctype)/i.test(code);
      out.push(`<pre><span class="bar-top"><span>${esc(lang || 'code')}</span>${previewable ? `<button class="preview" data-lang="${/svg/i.test(lang) || /^\s*<svg/i.test(code) ? 'svg' : 'html'}">Preview</button>` : ''}<button class="copy">Copy</button></span><code>${highlight(code, lang)}</code></pre>`);
      return;
    }
    out.push(renderBlocks(typeof pullMath === 'function' ? pullMath(part.replace(/^\n/, ''), maths) : part.replace(/^\n/, '')));
  });
  return typeof putMath === 'function' ? putMath(out.join(''), maths) : out.join('');
}
