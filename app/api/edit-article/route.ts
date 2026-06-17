import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@sanity/client';

const sanity = createClient({
  projectId: process.env.SANITY_PROJECT_ID!,
  dataset: process.env.SANITY_DATASET ?? 'production',
  token: process.env.SANITY_TOKEN!,
  apiVersion: '2024-01-01',
  useCdn: false,
});

function key() { return Math.random().toString(36).slice(2, 10); }

// Convert Portable Text → markdown (skips image blocks, preserves marks)
function ptToMarkdown(blocks: any[]): string {
  return blocks
    .map(block => {
      if (!block || block._type !== 'block') return null;
      const text = (block.children ?? []).map((child: any) => {
        let t = child.text ?? '';
        if (child.marks?.includes('strong')) t = `**${t}**`;
        if (child.marks?.includes('em')) t = `*${t}*`;
        return t;
      }).join('');
      if (!text.trim()) return null;
      if (block.style === 'h2') return `## ${text}`;
      if (block.style === 'h3') return `### ${text}`;
      if (block.style === 'h4') return `#### ${text}`;
      if (block.style === 'blockquote') return `> ${text}`;
      if (block.listItem === 'bullet') return `- ${text}`;
      return text;
    })
    .filter(Boolean)
    .join('\n\n');
}

// Convert markdown → Portable Text blocks
type PTSpan = { _type: 'span'; _key: string; text: string; marks: string[] };
type PTBlock = { _type: 'block'; _key: string; style: string; markDefs: any[]; children: PTSpan[]; listItem?: string; level?: number };

function parseInline(text: string): { children: PTSpan[]; markDefs: any[] } {
  const children: PTSpan[] = [];
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/);
  for (const part of parts) {
    if (!part) continue;
    if (part.startsWith('**') && part.endsWith('**')) {
      children.push({ _type: 'span', _key: key(), text: part.slice(2, -2), marks: ['strong'] });
    } else if (part.startsWith('*') && part.endsWith('*')) {
      children.push({ _type: 'span', _key: key(), text: part.slice(1, -1), marks: ['em'] });
    } else {
      children.push({ _type: 'span', _key: key(), text: part, marks: [] });
    }
  }
  return { children, markDefs: [] };
}

function markdownToPT(markdown: string): PTBlock[] {
  const blocks: PTBlock[] = [];
  const lines = markdown.split('\n');
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    if (line.startsWith('## ')) {
      const { children, markDefs } = parseInline(line.slice(3).trim());
      blocks.push({ _type: 'block', _key: key(), style: 'h2', markDefs, children });
      i++; continue;
    }
    if (line.startsWith('### ')) {
      const { children, markDefs } = parseInline(line.slice(4).trim());
      blocks.push({ _type: 'block', _key: key(), style: 'h3', markDefs, children });
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
    if (line.startsWith('> ')) {
      const { children, markDefs } = parseInline(line.slice(2).trim());
      blocks.push({ _type: 'block', _key: key(), style: 'blockquote', markDefs, children });
      i++; continue;
    }
    const paraLines: string[] = [];
    while (i < lines.length && lines[i].trim() && !lines[i].startsWith('#') && !/^[*>-] /.test(lines[i])) {
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

// GET — fetch article and return markdown + existing images
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const article = await sanity.fetch(
    `*[_id == $id][0] {
      _id, title, category, "slug": slug.current,
      body[]{ ..., _type == "image" => { ..., "assetUrl": asset->url } }
    }`,
    { id }
  );

  if (!article) return NextResponse.json({ error: 'Article not found' }, { status: 404 });

  // Extract existing images (to preserve them on save)
  // Track both H2 and H3 so images stay after their correct heading level
  const existingImages: Array<{ headingText: string; headingStyle: string; assetRef: string; alt: string }> = [];
  let lastHeading = '';
  let lastHeadingStyle = 'h2';
  for (const block of article.body ?? []) {
    if (block._type === 'block' && (block.style === 'h2' || block.style === 'h3')) {
      lastHeading = block.children?.[0]?.text ?? '';
      lastHeadingStyle = block.style;
    }
    if (block._type === 'image' && lastHeading) {
      existingImages.push({
        headingText: lastHeading,
        headingStyle: lastHeadingStyle,
        assetRef: block.asset?._ref ?? '',
        alt: block.alt ?? '',
      });
    }
  }

  // Convert text blocks to markdown (skip images)
  const textBlocks = (article.body ?? []).filter((b: any) => b._type === 'block');
  const markdown = ptToMarkdown(textBlocks);

  return NextResponse.json({
    id: article._id,
    title: article.title,
    category: article.category,
    slug: article.slug,
    markdown,
    existingImages,
  });
}

// POST — save edited markdown back to Sanity, preserving existing images
export async function POST(req: NextRequest) {
  const { id, markdown, existingImages } = await req.json();
  if (!id || !markdown) return NextResponse.json({ error: 'Missing id or markdown' }, { status: 400 });

  const newBlocks = markdownToPT(markdown);

  // Re-insert existing images after their matching H2 or H3 headings
  if (existingImages?.length) {
    for (const img of existingImages) {
      if (!img.assetRef) continue;
      const style = img.headingStyle ?? 'h2';
      const idx = newBlocks.findIndex(
        b => (b.style === style || b.style === 'h2' || b.style === 'h3') &&
             b.children?.[0]?.text === img.headingText
      );
      if (idx !== -1) {
        newBlocks.splice(idx + 1, 0, {
          _type: 'image',
          _key: key(),
          asset: { _type: 'reference', _ref: img.assetRef },
          alt: img.alt,
        } as any);
      }
    }
  }

  await sanity.patch(id).set({ body: newBlocks }).commit();
  await sanity.fetch(`*[_id == $id][0]`, { id }); // warm cache

  return NextResponse.json({ ok: true });
}
