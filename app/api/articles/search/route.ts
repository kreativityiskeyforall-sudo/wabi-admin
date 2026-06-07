import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@sanity/client';

const sanity = createClient({
  projectId: process.env.SANITY_PROJECT_ID!,
  dataset: process.env.SANITY_DATASET ?? 'production',
  token: process.env.SANITY_TOKEN!,
  apiVersion: '2024-01-01',
  useCdn: false,
});

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim() ?? '';

  if (!q) return NextResponse.json({ articles: [] });

  const results = await sanity.fetch<Array<{ title: string; category: string; slug: string }>>(
    `*[_type == "article" && title match $pattern] | order(title asc) [0...10] {
      title,
      category,
      "slug": slug.current
    }`,
    { pattern: `*${q}*` }
  );

  return NextResponse.json({ articles: results });
}
