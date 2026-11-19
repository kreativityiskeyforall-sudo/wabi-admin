type PTSpan = { _type: 'span'; _key: string; text: string; marks: string[] };
type PTMarkDef = { _type: string; _key: string; href?: string };
export type PTBlock = { _type: string; _key: string; style?: string; markDefs?: PTMarkDef[]; children?: PTSpan[]; listItem?: string; level?: number; alt?: string; asset?: unknown };

function key() { return Math.random().toString(36).slice(2, 10); }

function parseInline(text: string): { children: PTSpan[]; markDefs: PTMarkDef[] } {
  const children: PTSpan[] = [];
  const markDefs: PTMarkDef[] = [];
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/);
  for (const part of parts) {
    if (!part) continue;
    if (part.startsWith('**') && part.endsWith('**')) {
      children.push({ _type: 'span', _key: key(), text: part.slice(2, -2), marks: ['strong'] });
    } else if (part.startsWith('*') && part.endsWith('*') && !part.startsWith('**')) {
      children.push({ _type: 'span', _key: key(), text: part.slice(1, -1), marks: ['em'] });
    } else {
      const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (linkMatch) {
        const mk = key();
        markDefs.push({ _type: 'link', _key: mk, href: linkMatch[2] });
        children.push({ _type: 'span', _key: key(), text: linkMatch[1], marks: [mk] });
      } else {
        children.push({ _type: 'span', _key: key(), text: part, marks: [] });
      }
    }
  }
  return { children, markDefs };
}

export function markdownToPortableText(markdown: string): PTBlock[] {
  const blocks: PTBlock[] = [];
  const lines = markdown.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    if (line.trim() === '---' || line.trim() === '***') { i++; continue; }

    if (line.startsWith('### ')) {
      const { children, markDefs } = parseInline(line.slice(4).trim());
      blocks.push({ _type: 'block', _key: key(), style: 'h3', markDefs, children });
      i++; continue;
    }
    if (line.startsWith('## ')) {
      const { children, markDefs } = parseInline(line.slice(3).trim());
      blocks.push({ _type: 'block', _key: key(), style: 'h2', markDefs, children });
      i++; continue;
    }
    if (line.startsWith('# ')) {
      const { children, markDefs } = parseInline(line.slice(2).trim());
      blocks.push({ _type: 'block', _key: key(), style: 'h2', markDefs, children });
      i++; continue;
    }
    if (/^[*-] /.test(line)) {
      const { children, markDefs } = parseInline(line.slice(2).trim());
      blocks.push({ _type: 'block', _key: key(), style: 'normal', listItem: 'bullet', level: 1, markDefs, children });
      i++; continue;
    }

    const paraLines: string[] = [];
    while (i < lines.length && lines[i].trim() && !lines[i].startsWith('#') && !/^[*-] /.test(lines[i])) {
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length > 0) {
      const { children, markDefs } = parseInline(paraLines.join(' '));
      blocks.push({ _type: 'block', _key: key(), style: 'normal', markDefs, children });
    }
  }

  return blocks;
}

export function extractIntro(markdown: string): string {
  const lines = markdown.split('\n');
  const paraLines: string[] = [];
  for (const line of lines) {
    if (line.startsWith('#')) break;
    const trimmed = line.trim();
    if (trimmed) paraLines.push(trimmed);
    if (paraLines.length >= 3) break;
  }
  return paraLines.join(' ').slice(0, 320).trim();
}

export function extractPullQuote(markdown: string): string {
  const lines = markdown.split('\n');
  let pastIntro = false;
  let fallback = '';
  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    if (t.startsWith('#')) { pastIntro = true; continue; }
    if (!pastIntro) continue;
    const plain = t.replace(/\*\*/g, '').replace(/\*/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
    const sentences = plain.split(/(?<=[.!?])\s+/);
    for (const s of sentences) {
      const len = s.length;
      if (s.startsWith('-') || s.startsWith('[') || s.startsWith('!')) continue;
      if (len >= 40 && len <= 160) return s.trim();
      if (len >= 25 && len <= 200 && !fallback) fallback = s.trim();
    }
  }
  return fallback;
}

export function mapContentType(sheetType: string): string {
  if (sheetType === 'roundup') return 'roundup';
  if (sheetType === 'gift-guide') return 'gift-guide';
  if (sheetType === 'product-review') return 'roundup';
  return 'info';
}

export function buildKicker(category: string, wordCount: number): string {
  const CAT_LABELS: Record<string, string> = {
    'living-room': 'Living Room', bedroom: 'Bedroom', kitchen: 'Kitchen & Dining',
    bathroom: 'Bathroom', 'home-office': 'Home Office', entryway: 'Entryway',
    style: 'Style', guides: 'Guide', 'gift-guides': 'Gifts',
  };
  const label = CAT_LABELS[category] ?? category;
  const mins = Math.max(3, Math.round(wordCount / 200));
  return `${label} · ${mins} min read`;
}

export function randomKey() { return key(); }
