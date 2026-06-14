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

type PTSpan = { _type: 'span'; _key: string; text: string; marks: string[] };
type PTMarkDef = { _type: string; _key: string; href?: string };
type PTBlock = { _type: 'block'; _key: string; style: string; markDefs: PTMarkDef[]; children: PTSpan[]; listItem?: string; level?: number };

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

function markdownToPortableText(markdown: string): PTBlock[] {
  const blocks: PTBlock[] = [];
  const lines = markdown.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) { i++; continue; }

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

    // Paragraph: collect consecutive content lines
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

async function uploadImageUrl(imageUrl: string, filename: string) {
  const imgRes = await fetch(imageUrl);
  const imgBuffer = Buffer.from(await imgRes.arrayBuffer());
  const asset = await sanity.assets.upload('image', imgBuffer, {
    filename,
    contentType: 'image/jpeg',
  });
  return asset._id;
}

function extractIntro(markdown: string): string {
  const lines = markdown.split('\n');
  const paraLines: string[] = [];
  for (const line of lines) {
    if (line.startsWith('#')) break; // stop at first heading
    const trimmed = line.trim();
    if (trimmed) paraLines.push(trimmed);
    if (paraLines.length >= 3) break; // take up to 3 sentences
  }
  return paraLines.join(' ').slice(0, 320).trim();
}

function buildKicker(category: string, wordCount: number): string {
  const CAT_LABELS: Record<string, string> = {
    'living-room': 'Living Room', bedroom: 'Bedroom', kitchen: 'Kitchen & Dining',
    bathroom: 'Bathroom', 'home-office': 'Home Office', entryway: 'Entryway',
    style: 'Style', guides: 'Guide', 'gift-guides': 'Gifts',
  };
  const label = CAT_LABELS[category] ?? category;
  const mins = Math.max(3, Math.round(wordCount / 200));
  return `${label} · ${mins} min read`;
}

export async function POST(req: NextRequest) {
  const { title, slug, body, category, type, cluster, isMother, featuredImageUrl, sectionImages, pinterestPins, publishedAt } = await req.json();

  if (!title || !slug || !body) {
    return NextResponse.json({ error: 'title, slug, and body are required' }, { status: 400 });
  }

  // Convert markdown body → Sanity Portable Text
  const portableBody = markdownToPortableText(body);

  // Strip leading heading block if it duplicates the article title
  // (Claude often opens the article with # Title or ## Title)
  if (portableBody.length > 0) {
    const first = portableBody[0];
    if ((first.style === 'h1' || first.style === 'h2') && first.children?.[0]) {
      const headingText = first.children[0].text?.trim().toLowerCase() ?? '';
      const titleText = title.trim().toLowerCase();
      if (headingText === titleText || titleText.includes(headingText) || headingText.includes(titleText.slice(0, 30))) {
        portableBody.shift();
      }
    }
  }

  // Upload featured image
  let featuredImage = null;
  if (featuredImageUrl) {
    try {
      const assetId = await uploadImageUrl(featuredImageUrl, `${slug}-featured.jpg`);
      featuredImage = { _type: 'image', asset: { _type: 'reference', _ref: assetId } };
    } catch { /* continue without featured image */ }
  }

  // Upload section images and insert them after matching H2 blocks
  if (Array.isArray(sectionImages) && sectionImages.length > 0) {
    for (const section of sectionImages) {
      if (!section.imageUrl) continue;
      try {
        const assetId = await uploadImageUrl(
          section.imageUrl,
          `${slug}-section-${section.headingText.slice(0, 30).replace(/[^a-z0-9]/gi, '-').toLowerCase()}.jpg`
        );
        // Find matching H2 or H3 block
        const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
        const target = normalize(section.headingText);
        const headingIdx = portableBody.findIndex(b =>
          (b.style === 'h2' || b.style === 'h3') &&
          (b.children?.[0]?.text === section.headingText || normalize(b.children?.[0]?.text ?? '') === target)
        );
        if (headingIdx !== -1) {
          portableBody.splice(headingIdx + 1, 0, {
            _type: 'image',
            _key: key(),
            asset: { _type: 'reference', _ref: assetId },
            alt: section.altText ?? section.headingText,
          } as any);
        }
      } catch { /* skip this image if upload fails */ }
    }
  }

  // Upload Pinterest pins to Sanity CDN (makes URLs permanent)
  const savedPins: any[] = [];
  if (Array.isArray(pinterestPins) && pinterestPins.length > 0) {
    await Promise.all(pinterestPins.map(async (pin: { url: string; layout: string }, i: number) => {
      if (!pin.url) return;
      try {
        const assetId = await uploadImageUrl(pin.url, `${slug}-pin-${i + 1}.jpg`);
        savedPins[i] = {
          _type: 'pinImage',
          _key: key(),
          asset: { _type: 'reference', _ref: assetId },
          layout: pin.layout ?? 'complete',
        };
      } catch { /* skip failed pin upload */ }
    }));
  }

  const intro = extractIntro(body);
  const wordCount = body.split(/\s+/).length;
  const kicker = buildKicker(category, wordCount);

  const doc = {
    _type: 'article',
    title,
    slug: { _type: 'slug', current: slug },
    body: portableBody,
    intro: intro || null,
    kicker,
    category,
    articleType: type,
    cluster: cluster ?? null,
    isMother: isMother ?? false,
    featuredImage,
    pinterestPins: savedPins.filter(Boolean),
    publishedAt: publishedAt ?? new Date().toISOString(),
  };

  const created = await sanity.create(doc);

  return NextResponse.json({ id: created._id, slug });
}
