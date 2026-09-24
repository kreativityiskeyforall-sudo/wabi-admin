import { NextResponse } from 'next/server';
import { createClient } from '@sanity/client';
import Anthropic from '@anthropic-ai/sdk';

export const maxDuration = 300;

const sanity = createClient({
  projectId: process.env.SANITY_PROJECT_ID!,
  dataset: process.env.SANITY_DATASET ?? 'production',
  token: process.env.SANITY_TOKEN!,
  apiVersion: '2024-01-01',
  useCdn: false,
});

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

async function generateAltText(imageUrl: string, headingContext: string): Promise<string> {
  try {
    // Fetch image and convert to base64 (SDK 0.24 doesn't support url source type)
    const smallUrl = imageUrl.includes('cdn.sanity.io') ? `${imageUrl}?w=400&fm=jpg&q=70` : imageUrl;
    const imgRes = await fetch(smallUrl);
    if (!imgRes.ok) return headingContext;
    const buffer = Buffer.from(await imgRes.arrayBuffer());
    const b64 = buffer.toString('base64');
    const mediaType = (imgRes.headers.get('content-type') ?? 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 80,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: b64 } },
          {
            type: 'text',
            text: `Write alt text for this home decor image. Context: it illustrates "${headingContext}". One sentence, under 120 characters, describing what is literally visible. No preamble, start directly.`,
          },
        ],
      }],
    });
    const text = response.content[0].type === 'text' ? response.content[0].text.trim() : '';
    return text.slice(0, 125) || headingContext;
  } catch {
    return headingContext;
  }
}

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not set' }, { status: 500 });
  }

  const body = await req.json().catch(() => ({}));
  const offset = Number(body.offset ?? 0);
  const batchSize = 5; // process 5 articles per call (~100 images max)

  const articlesWithHeadings = await sanity.fetch(`
    *[_type == "article" && defined(slug.current)] | order(_createdAt asc) [$from...$to] {
      _id,
      title,
      body[] {
        _type,
        _key,
        style,
        "text": children[0].text,
        "url": asset->url,
        alt
      }
    }
  `, { from: offset, to: offset + batchSize });

  const totalArticles = await sanity.fetch(`count(*[_type == "article" && defined(slug.current)])`);

  let totalProcessed = 0;
  let totalUpdated = 0;
  const errors: string[] = [];

  for (const article of articlesWithHeadings) {
    const body: any[] = article.body ?? [];
    let lastHeading = article.title ?? '';

    // Find image blocks that need alt text
    const toUpdate: Array<{ key: string; imageUrl: string; heading: string }> = [];

    for (const block of body) {
      if (block._type === 'block' && ['h1','h2','h3','h4'].includes(block.style)) {
        lastHeading = block.text || lastHeading;
      }
      // Update if: no alt, OR alt doesn't look like a real description
      // (real descriptions end with punctuation and are longer than 40 chars)
      const needsVision = block._type === 'image' && block.url && (
        !block.alt ||
        block.alt.trim() === '' ||
        (!block.alt.trim().match(/[.!?]$/) && block.alt.trim().length < 120)
      );
      if (needsVision) {
        toUpdate.push({ key: block._key, imageUrl: block.url, heading: lastHeading });
      }
    }

    if (toUpdate.length === 0) continue;

    // Generate alt text in parallel for all images in this article
    const results = await Promise.all(
      toUpdate.map(item => generateAltText(item.imageUrl, item.heading))
    );

    // Patch each image block's alt field in Sanity
    try {
      let patch = sanity.patch(article._id);
      for (let i = 0; i < toUpdate.length; i++) {
        const { key: blockKey } = toUpdate[i];
        patch = patch.set({ [`body[_key=="${blockKey}"].alt`]: results[i] });
      }
      await patch.commit();
      totalUpdated += toUpdate.length;
    } catch (e: any) {
      errors.push(`${article.title}: ${e.message}`);
    }

    totalProcessed++;
  }

  const nextOffset = offset + batchSize;
  const hasMore = nextOffset < totalArticles;

  return NextResponse.json({
    articlesProcessed: totalProcessed,
    imagesUpdated: totalUpdated,
    nextOffset: hasMore ? nextOffset : null,
    totalArticles,
    errors: errors.length > 0 ? errors : undefined,
  });
}
