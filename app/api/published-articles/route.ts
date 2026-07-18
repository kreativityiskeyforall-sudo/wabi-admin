import { NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { createClient } from '@sanity/client';

export const dynamic = 'force-dynamic';

const sanity = createClient({
  projectId: process.env.SANITY_PROJECT_ID!,
  dataset: process.env.SANITY_DATASET ?? 'production',
  token: process.env.SANITY_TOKEN!,
  apiVersion: '2024-01-01',
  useCdn: false,
});

export async function GET() {
  noStore();
  const articles = await sanity.fetch(`
    *[_type == "article"] | order(category asc, title asc) {
      _id,
      title,
      category,
      "slug": slug.current,
      publishedAt,
      "internalCount": count(internalLinks),
      "externalCount": count(externalLinks),
      internalLinks[] {
        label,
        "title": coalesce(article->title, product->editorialName),
        "category": coalesce(article->category, product->category),
        "slug": coalesce(article->slug.current, product->slug.current)
      },
      externalLinks[] {
        label,
        url
      }
    }
  `);

  return NextResponse.json({ articles });
}
