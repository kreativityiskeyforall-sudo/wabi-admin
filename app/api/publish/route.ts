import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@sanity/client';

const sanity = createClient({
  projectId: process.env.SANITY_PROJECT_ID!,
  dataset: process.env.SANITY_DATASET ?? 'production',
  token: process.env.SANITY_TOKEN!,
  apiVersion: '2024-01-01',
  useCdn: false,
});

export async function POST(req: NextRequest) {
  const { title, slug, body, category, type, featuredImageUrl, publishedAt } = await req.json();

  if (!title || !slug || !body) {
    return NextResponse.json({ error: 'title, slug, and body are required' }, { status: 400 });
  }

  // Upload featured image to Sanity CDN if URL provided
  let featuredImage = null;
  if (featuredImageUrl) {
    const imgRes = await fetch(featuredImageUrl);
    const imgBlob = await imgRes.blob();
    const imgBuffer = Buffer.from(await imgBlob.arrayBuffer());
    const asset = await sanity.assets.upload('image', imgBuffer, {
      filename: `${slug}-featured.jpg`,
      contentType: 'image/jpeg',
    });
    featuredImage = { _type: 'image', asset: { _type: 'reference', _ref: asset._id } };
  }

  const doc = {
    _type: 'article',
    title,
    slug: { _type: 'slug', current: slug },
    body,
    category,
    articleType: type,
    featuredImage,
    publishedAt: publishedAt ?? new Date().toISOString(),
  };

  const created = await sanity.create(doc);

  return NextResponse.json({ id: created._id, slug });
}
