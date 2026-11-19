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
  );
  return NextResponse.json({ drafts }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
