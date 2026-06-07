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
    *[_type == "article"] | order(category asc, title asc) {
      _id, title, category, "slug": slug.current,
      "sectionImages": body[_type == "image"] {
        "url": asset->url,
        alt,
        "_key": _key
      }
    }
  `);

  // Only return articles that have section images
  const withImages = articles.filter((a: any) => a.sectionImages?.length > 0);
  return NextResponse.json({ articles: withImages });
}
