import { redirect, notFound } from 'next/navigation';
import { createClient } from '@sanity/client';

const sanity = createClient({
  projectId: process.env.SANITY_PROJECT_ID!,
  dataset: process.env.SANITY_DATASET ?? 'production',
  token: process.env.SANITY_TOKEN!,
  apiVersion: '2024-01-01',
  useCdn: false,
});

export default async function EditBySlugPage({ searchParams }: { searchParams: { slug?: string } }) {
  const slug = searchParams.slug;
  if (!slug) notFound();

  const doc = await sanity.fetch(
    `*[_type == "article" && slug.current == $slug][0]{ _id }`,
    { slug }
  );

  if (!doc?._id) notFound();

  const cleanId = doc._id.replace(/^drafts\./, '');
  redirect(`/edit/${cleanId}`);
}
