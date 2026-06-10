import { NextResponse } from 'next/server';
import { createClient } from '@sanity/client';

const sanity = createClient({
  projectId: process.env.SANITY_PROJECT_ID!,
  dataset: process.env.SANITY_DATASET ?? 'production',
  token: process.env.SANITY_TOKEN!,
  apiVersion: '2024-01-01',
  useCdn: false,
});

// One-time patch to set cluster + isMother on articles published before
// this feature was added. Safe to call multiple times (idempotent).
const PATCHES = [
  {
    id: '4smu7Ks5k1PWjXUh5MFMpq',
    title: 'The Ultimate Japandi Living Room Guide',
    cluster: 'Cluster A',
    isMother: true,
  },
  {
    id: 'Q8KryWCEhbKpFoiEda6IDW',
    title: '23 Japandi Living Room Ideas That Feel Calm',
    cluster: 'Cluster A',
    isMother: false,
  },
  {
    id: 'Qi99oWPenHHgrpR8Wim4UC',
    title: '15 Japandi Living Room Ideas on a Budget',
    cluster: 'Cluster A',
    isMother: false,
  },
  {
    id: 'f9fd8bb0-f93a-45a7-9db4-2983c2da43aa',
    title: '21 Japandi Bedroom Ideas',
    cluster: 'Cluster A',
    isMother: false,
  },
];

export async function GET() {
  const results: string[] = [];

  for (const p of PATCHES) {
    try {
      await sanity.patch(p.id).set({ cluster: p.cluster, isMother: p.isMother }).commit();
      results.push(`✓ ${p.title} → cluster: ${p.cluster}, isMother: ${p.isMother}`);
    } catch (e: unknown) {
      results.push(`✕ ${p.title} → ${e instanceof Error ? e.message : 'failed'}`);
    }
  }

  return NextResponse.json({ done: true, results });
}
