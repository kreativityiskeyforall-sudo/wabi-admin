import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@sanity/client';

const sanity = createClient({
  projectId: process.env.SANITY_PROJECT_ID!,
  dataset: process.env.SANITY_DATASET ?? 'production',
  token: process.env.SANITY_TOKEN!,
  apiVersion: '2024-01-01',
  useCdn: false,
});

// GET: list all comments (admin only)
export async function GET() {
  const comments = await sanity.fetch(
    `*[_type == "comment"] | order(createdAt desc) {
      _id, name, email, body, articleSlug, articleTitle, status, createdAt
    }`
  );
  return NextResponse.json({ comments });
}

// PATCH: update comment status
export async function PATCH(req: NextRequest) {
  const { id, status } = await req.json();
  if (!id || !['approved', 'rejected', 'pending'].includes(status)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  await sanity.patch(id).set({ status }).commit();
  return NextResponse.json({ success: true });
}

// DELETE: remove comment
export async function DELETE(req: NextRequest) {
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  await sanity.delete(id);
  return NextResponse.json({ success: true });
}
