// Turns an answer (Markdown) into real files: Word (.docx), PowerPoint (.pptx) and PDF.
const fs = require('node:fs');

// ---------- a small Markdown block parser ----------

function blocks(md) {
  const out = [];
  const lines = String(md).replace(/\r/g, '').split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let m;
    if (/^```/.test(line)) {
      const lang = line.slice(3).trim();
      const body = [];
      while (++i < lines.length && !/^```/.test(lines[i])) body.push(lines[i]);
      out.push({ type: lang === 'chart' ? 'chart' : 'code', text: body.join('\n'), lang });
    } else if ((m = line.match(/^(#{1,6})\s+(.*)/))) out.push({ type: 'h', level: m[1].length, text: m[2] });
    else if (/^\s*\|.*\|\s*$/.test(line) && /^\s*\|?\s*:?-{2,}/.test(lines[i + 1] || '')) {
      const cells = (l) => l.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map((c) => c.trim());
      const rows = [cells(line)];
      i++;
      while (i + 1 < lines.length && /^\s*\|.*\|\s*$/.test(lines[i + 1])) rows.push(cells(lines[++i]));
      out.push({ type: 'table', rows });
    } else if ((m = line.match(/^(\s*)[-*•]\s+(.*)/))) out.push({ type: 'li', text: m[2], level: Math.min(3, Math.floor(m[1].length / 2)) });
    else if ((m = line.match(/^(\s*)\d+[.)]\s+(.*)/))) out.push({ type: 'oli', text: m[2], level: Math.min(3, Math.floor(m[1].length / 2)) });
    else if ((m = line.match(/^>\s?(.*)/))) out.push({ type: 'quote', text: m[1] });
    else if (/^\s*(-{3,}|\*{3,})\s*$/.test(line)) out.push({ type: 'hr' });
    else if (line.trim()) {
      const last = out[out.length - 1];
      if (last?.type === 'p') last.text += ` ${line.trim()}`; else out.push({ type: 'p', text: line.trim() });
    } else out.push({ type: 'gap' });
  }
  return out.filter((b, k, a) => !(b.type === 'gap' && a[k - 1]?.type === 'gap'));
}

// "**bold** and *italic* and `code`" -> [{text, bold, italics, code}]
function runs(text) {
  const out = [];
  const re = /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|`[^`]+`|\[(\d{1,2})\])/g;
  let last = 0;
  let m;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push({ text: text.slice(last, m.index) });
    const t = m[0];
    if (t.startsWith('**')) out.push({ text: t.slice(2, -2), bold: true });
    else if (t.startsWith('`')) out.push({ text: t.slice(1, -1), code: true });
    else if (t.startsWith('[')) out.push({ text: t, superScript: true });
    else out.push({ text: t.slice(1, -1), italics: true });
    last = m.index + t.length;
  }
  if (last < text.length) out.push({ text: text.slice(last) });
  return out.map((r) => ({ ...r, text: r.text.replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, '$1 ($2)') }));
}
const plain = (t) => runs(t).map((r) => r.text).join('');

// ---------- Word ----------

async function toDocx(markdown, file, { title } = {}) {
  const d = require('docx');
  const kids = [];
  const run = (r) => new d.TextRun({ text: r.text, bold: r.bold, italics: r.italics, superScript: r.superScript, font: r.code ? 'Consolas' : undefined });
  const HEAD = [d.HeadingLevel.HEADING_1, d.HeadingLevel.HEADING_2, d.HeadingLevel.HEADING_3, d.HeadingLevel.HEADING_4, d.HeadingLevel.HEADING_5, d.HeadingLevel.HEADING_6];
  if (title && !/^#\s/.test(markdown.trim())) kids.push(new d.Paragraph({ text: title, heading: d.HeadingLevel.TITLE }));
  for (const b of blocks(markdown)) {
    if (b.type === 'h') kids.push(new d.Paragraph({ children: runs(b.text).map(run), heading: b.level === 1 && !kids.length ? d.HeadingLevel.TITLE : HEAD[b.level - 1] }));
    else if (b.type === 'p') kids.push(new d.Paragraph({ children: runs(b.text).map(run), spacing: { after: 160 } }));
    else if (b.type === 'li') kids.push(new d.Paragraph({ children: runs(b.text).map(run), bullet: { level: b.level } }));
    else if (b.type === 'oli') kids.push(new d.Paragraph({ children: runs(b.text).map(run), numbering: { reference: 'num', level: b.level } }));
    else if (b.type === 'quote') kids.push(new d.Paragraph({ children: runs(b.text).map((r) => run({ ...r, italics: true })), indent: { left: 720 } }));
    else if (b.type === 'code' || b.type === 'chart') for (const l of b.text.split('\n')) kids.push(new d.Paragraph({ children: [new d.TextRun({ text: l || ' ', font: 'Consolas', size: 19 })], shading: { fill: 'F3EFFD', type: d.ShadingType.CLEAR, color: 'auto' } }));
    else if (b.type === 'table') {
      kids.push(new d.Table({
        width: { size: 100, type: d.WidthType.PERCENTAGE },
        rows: b.rows.map((row, ri) => new d.TableRow({
          tableHeader: ri === 0,
          children: b.rows[0].map((_, ci) => new d.TableCell({
            shading: ri === 0 ? { fill: 'E4DCFF', type: d.ShadingType.CLEAR, color: 'auto' } : undefined,
            children: [new d.Paragraph({ children: runs(row[ci] || '').map((r) => run({ ...r, bold: r.bold || ri === 0 })) })],
          })),
        })),
      }));
      kids.push(new d.Paragraph({ text: '' }));
    } else if (b.type === 'hr') kids.push(new d.Paragraph({ border: { bottom: { color: 'A99FD6', space: 1, style: d.BorderStyle.SINGLE, size: 6 } } }));
  }
  const doc = new d.Document({
    creator: 'Quicksilver',
    title: title || 'Document',
    styles: { default: { document: { run: { font: 'Calibri', size: 22 } } } },
    numbering: { config: [{ reference: 'num', levels: [0, 1, 2, 3].map((level) => ({ level, format: d.LevelFormat.DECIMAL, text: `%${level + 1}.`, alignment: d.AlignmentType.START, style: { paragraph: { indent: { left: 720 * (level + 1), hanging: 360 } } } })) }] },
    sections: [{ children: kids }],
  });
  fs.writeFileSync(file, await d.Packer.toBuffer(doc));
}

// ---------- PowerPoint ----------
// Slides come from "## " headings; bullets become slide bullets; "Notes:" lines become speaker notes;
// tables become slide tables; ```chart blocks become native charts.

async function toPptx(markdown, file, { title } = {}) {
  const PptxGenJS = require('pptxgenjs');
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.title = title || 'Presentation';
  const C = { ink: '16122A', muted: '3D3858', accent: '4527B8', lav: 'E6DFFF', sky: 'D5E9FF', mint: 'CFF3E2' };
  pptx.defineSlideMaster({ title: 'QS', background: { color: 'FFFFFF' }, objects: [{ rect: { x: 0, y: 7.2, w: 13.33, h: 0.3, fill: { color: C.lav } } }] });

  const bs = blocks(markdown);
  const deckTitle = bs.find((b) => b.type === 'h' && b.level === 1)?.text || title || 'Presentation';
  const subtitle = bs.find((b, i) => b.type === 'p' && i < 4)?.text || '';
  const cover = pptx.addSlide();
  cover.background = { color: 'F6F3FF' };
  cover.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.35, h: 7.5, fill: { color: C.accent } });
  cover.addText(plain(deckTitle), { x: 0.9, y: 2.3, w: 11.5, h: 1.5, fontSize: 40, bold: true, color: C.ink, fontFace: 'Segoe UI' });
  if (subtitle) cover.addText(plain(subtitle), { x: 0.9, y: 3.9, w: 11.5, h: 1, fontSize: 20, color: C.muted, fontFace: 'Segoe UI' });

  const slides = [];
  let cur = null;
  for (const b of bs) {
    if (b.type === 'h' && b.level === 2) { cur = { title: b.text, items: [], notes: [] }; slides.push(cur); continue; }
    if (!cur) continue;
    if (b.type === 'p' && /^notes?:/i.test(b.text)) cur.notes.push(b.text.replace(/^notes?:\s*/i, ''));
    else if (['li', 'oli', 'p', 'quote', 'h', 'table', 'chart', 'code'].includes(b.type)) cur.items.push(b);
  }
  for (const s of slides) {
    const slide = pptx.addSlide({ masterName: 'QS' });
    slide.addText(plain(s.title), { x: 0.6, y: 0.35, w: 12.1, h: 0.9, fontSize: 30, bold: true, color: C.accent, fontFace: 'Segoe UI' });
    const table = s.items.find((x) => x.type === 'table');
    const chart = s.items.find((x) => x.type === 'chart');
    const textItems = s.items.filter((x) => x.type !== 'table' && x.type !== 'chart');
    const hasVisual = table || chart;
    if (textItems.length) {
      slide.addText(textItems.map((x) => ({
        text: plain(x.text),
        options: { bullet: x.type === 'li' ? { indent: 22 } : x.type === 'oli' ? { type: 'number' } : false, indentLevel: x.level || 0, bold: x.type === 'h', breakLine: true, paraSpaceAfter: 8 },
      })), { x: 0.7, y: 1.45, w: hasVisual ? 5.6 : 11.9, h: 5.5, fontSize: textItems.length > 7 ? 16 : 20, color: C.ink, fontFace: 'Segoe UI', valign: 'top' });
    }
    if (table) {
      slide.addTable(table.rows.map((r, ri) => r.map((c) => ({ text: plain(c), options: { bold: ri === 0, fill: { color: ri === 0 ? C.lav : 'FFFFFF' }, color: C.ink } }))), { x: textItems.length ? 6.6 : 0.7, y: 1.5, w: textItems.length ? 6.1 : 11.9, fontSize: 14, border: { type: 'solid', color: 'C6B8FF', pt: 1 }, fontFace: 'Segoe UI' });
    } else if (chart) {
      try {
        const spec = JSON.parse(chart.text);
        const type = { bar: pptx.ChartType.bar, line: pptx.ChartType.line, pie: pptx.ChartType.pie, doughnut: pptx.ChartType.doughnut, area: pptx.ChartType.area }[spec.type] || pptx.ChartType.bar;
        slide.addChart(type, (spec.series || []).map((se) => ({ name: se.name, labels: spec.labels, values: se.data })), { x: textItems.length ? 6.6 : 0.9, y: 1.5, w: textItems.length ? 6.1 : 11.5, h: 5.3, showLegend: (spec.series || []).length > 1 || spec.type === 'pie', chartColors: ['7B5CFF', '4F8FE0', '3FBF86', 'E8834A', 'D6467A', 'D9B22B'], showTitle: Boolean(spec.title), title: spec.title });
      } catch { /* not valid chart data: skip */ }
    }
    if (s.notes.length) slide.addNotes(s.notes.join('\n'));
  }
  if (!slides.length) {
    const slide = pptx.addSlide({ masterName: 'QS' });
    slide.addText(bs.filter((b) => ['p', 'li', 'oli'].includes(b.type)).slice(0, 10).map((b) => ({ text: plain(b.text), options: { bullet: b.type !== 'p', breakLine: true } })), { x: 0.7, y: 0.8, w: 11.9, h: 6, fontSize: 18, color: C.ink, valign: 'top' });
  }
  await pptx.writeFile({ fileName: file });
}

// ---------- PDF (prints the rendered answer) ----------

async function toPdf(html, file, { title } = {}) {
  const { BrowserWindow } = require('electron');
  const w = new BrowserWindow({ show: false, webPreferences: { sandbox: true, javascript: false } });
  const page = `<!doctype html><html><head><meta charset="utf-8"><title>${title || 'Document'}</title><style>
    body{font:12pt/1.55 "Segoe UI",system-ui,sans-serif;color:#16122a;margin:0;padding:0}
    h1{font-size:22pt;color:#351c96}h2{font-size:16pt;color:#351c96;margin-top:18pt}h3{font-size:13pt}
    table{border-collapse:collapse;width:100%;margin:8pt 0}th,td{border:1px solid #c6b8ff;padding:4pt 6pt;text-align:left}th{background:#e6dfff}
    pre{background:#f3effd;padding:8pt;border-radius:6pt;white-space:pre-wrap;font:9.5pt Consolas,monospace}code{font-family:Consolas,monospace}
    blockquote{border-left:3pt solid #a99fd6;margin:0;padding-left:10pt;color:#3d3858}.table-tools,.copy,.bar-top{display:none}
    .cite{font-size:8pt;vertical-align:super;color:#351c96}svg{max-width:100%}</style></head><body>${title ? `<h1>${title}</h1>` : ''}${html}</body></html>`;
  await w.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(page)}`);
  const pdf = await w.webContents.printToPDF({ pageSize: 'A4', printBackground: true, margins: { top: 0.6, bottom: 0.6, left: 0.6, right: 0.6 } });
  w.destroy();
  fs.writeFileSync(file, pdf);
}

module.exports = { toDocx, toPptx, toPdf, blocks };
