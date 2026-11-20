import { NextResponse } from 'next/server';
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
  if (!process.env.SANITY_TOKEN) {
    return NextResponse.json(
      { error: 'SANITY_TOKEN is not set — add it to this Vercel environment (Preview + Production)', drafts: [] },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const drafts = await sanity.fetch<Array<{
    _id: string; title: string; slug: string; category: string;
    type: string; cluster: string | null; _createdAt: string; _updatedAt: string;
    hasFeaturedImage: boolean;
  }>>(
    `*[_type == "article" && _id in path("drafts.**")] | order(_updatedAt desc) {
      _id, title, "slug": slug.current, category, type, cluster,
      _createdAt, _updatedAt,
      "hasFeaturedImage": defined(featuredImage)
    }`,
    {},
    // perspective:'raw' ensures drafts are visible; cache:'no-store' bypasses
    // Next.js data-fetch caching so newly created drafts appear immediately.
    { perspective: 'raw', cache: 'no-store' } as Parameters<typeof sanity.fetch>[2],
  );
  return NextResponse.json({ drafts }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
