import { NextResponse } from 'next/server';
import { createClient } from '@sanity/client';

const sanity = createClient({
  projectId: process.env.SANITY_PROJECT_ID!,
  dataset: process.env.SANITY_DATASET ?? 'production',
  token: process.env.SANITY_TOKEN!,
  apiVersion: '2024-01-01',
  useCdn: false,
});

export async function GET() {
  const articles = await sanity.fetch(`
    *[_type == "article" && defined(pinterestPins) && count(pinterestPins) > 0] | order(category asc, title asc) {
      _id, title, category, "slug": slug.current,
      pinterestPins[] {
        "url": asset->url,
        layout
      }
    }
  `);

  return NextResponse.json({ articles: articles ?? [] });
}
