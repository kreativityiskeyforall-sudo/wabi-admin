import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@sanity/client';
import Anthropic from '@anthropic-ai/sdk';

const sanity = createClient({
  projectId: process.env.SANITY_PROJECT_ID!,
  dataset: process.env.SANITY_DATASET ?? 'production',
  token: process.env.SANITY_TOKEN!,
  apiVersion: '2024-01-01',
  useCdn: false,
});

const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function key() { return Math.random().toString(36).slice(2, 10); }

interface Article {
  _id: string;
  title: string;
  slug: string;
  category: string;
  cluster: string | null;
  isMother: boolean;
  linkedIds: string[];         // IDs this article already links to via internalLinks
  hasExternalLink: boolean;
}

async function askClaude(prompt: string): Promise<string> {
  const msg = await claude.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
    messages: [{ role: 'user', content: prompt }],
  });
  return msg.content[0].type === 'text' ? msg.content[0].text : '';
}

function parseJson(text: string): any {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try { return JSON.parse(match[0]); } catch { return null; }
}

async function addInternalLink(fromId: string, toId: string, label: string) {
  await sanity.patch(fromId)
    .setIfMissing({ internalLinks: [] })
    .append('internalLinks', [{
      _type: 'internalLinkEntry',
      _key: key(),
      label,
      article: { _type: 'reference', _ref: toId },
    }])
    .commit();
}

async function addExternalLink(docId: string, url: string, label: string, description: string) {
  await sanity.patch(docId)
    .setIfMissing({ externalLinks: [] })
    .append('externalLinks', [{
      _type: 'externalLinkEntry',
      _key: key(),
      label,
      url,
      description,
    }])
    .commit();
}

export async function GET(req: NextRequest) {
  // Vercel cron sets this header automatically using CRON_SECRET env var
  const auth = req.headers.get('authorization');
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Fetch all published articles
  const raw = await sanity.fetch<Array<{
    _id: string; title: string; slug: string; category: string;
    cluster: string | null; isMother: boolean;
    internalLinks: Array<{ linkedId: string | null }>;
    externalLinks: Array<{ url: string }>;
  }>>(`*[_type == "article" && defined(slug.current)] {
    _id, title, "slug": slug.current, category,
    cluster, isMother,
    "internalLinks": internalLinks[]{ "linkedId": article->._id },
    "externalLinks": externalLinks[]{ url }
  }`);

  const articles: Article[] = raw.map(a => ({
    _id: a._id,
    title: a.title,
    slug: a.slug,
    category: a.category,
    cluster: a.cluster ?? null,
    isMother: a.isMother ?? false,
    linkedIds: (a.internalLinks ?? []).map(l => l.linkedId).filter(Boolean) as string[],
    hasExternalLink: (a.externalLinks ?? []).length > 0,
  }));

  const fixes: string[] = [];

  // Group by category
  const byCategory: Record<string, Article[]> = {};
  for (const a of articles) {
    if (!byCategory[a.category]) byCategory[a.category] = [];
    byCategory[a.category].push(a);
  }

  for (const catArticles of Object.values(byCategory)) {
    const mothers = catArticles.filter(a => a.isMother && a.cluster);

    // Group by cluster
    const byCluster: Record<string, Article[]> = {};
    for (const a of catArticles) {
      if (!a.cluster) continue;
      if (!byCluster[a.cluster]) byCluster[a.cluster] = [];
      byCluster[a.cluster].push(a);
    }

    for (const clusterArticles of Object.values(byCluster)) {
      const mother = clusterArticles.find(a => a.isMother);
      const branches = clusterArticles.filter(a => !a.isMother);
      if (!mother) continue;

      // 1. Every branch must link TO its mother
      for (const branch of branches) {
        if (!branch.linkedIds.includes(mother._id)) {
          await addInternalLink(branch._id, mother._id, `Complete guide: ${mother.title}`);
          fixes.push(`BRANCH→MOTHER: "${branch.title}" → "${mother.title}"`);
        }
      }

      // 2. Mother must link to ALL its branches
      for (const branch of branches) {
        if (!mother.linkedIds.includes(branch._id)) {
          await addInternalLink(mother._id, branch._id, branch.title);
          fixes.push(`MOTHER→BRANCH: "${mother.title}" → "${branch.title}"`);
        }
      }

      // 3. Mother links to exactly ONE other mother in same category (most relevant)
      const otherMothers = mothers.filter(m => m._id !== mother._id);
      const alreadyLinksToAMother = mother.linkedIds.some(id => mothers.some(m => m._id === id));

      if (otherMothers.length > 0 && !alreadyLinksToAMother) {
        const list = otherMothers.map((m, i) => `${i + 1}. "${m.title}" (id:${m._id})`).join('\n');
        const raw = await askClaude(
          `Article: "${mother.title}"\nOther pillar guides in same category:\n${list}\n\nWhich ONE is most topically related? Return JSON: {"id":"the-id","label":"4-6 word anchor text"}`
        );
        const pick = parseJson(raw);
        if (pick?.id && pick?.label) {
          await addInternalLink(mother._id, pick.id, pick.label);
          const picked = otherMothers.find(m => m._id === pick.id);
          fixes.push(`MOTHER→MOTHER: "${mother.title}" → "${picked?.title ?? pick.id}"`);
        }
      }
    }

    // 4. Every article needs at least one external link
    for (const article of catArticles) {
      if (!article.hasExternalLink) {
        const raw = await askClaude(
          `Article: "${article.title}" (${article.category} home decor)\nSuggest ONE external link to a real authoritative source.\nUse: dezeen.com, architecturaldigest.com, housebeautiful.com, mydomaine.com, apartmenttherapy.com\nReturn JSON: {"url":"full url","label":"4-6 word anchor text","description":"why this source"}`
        );
        const ext = parseJson(raw);
        if (ext?.url && ext?.label) {
          await addExternalLink(article._id, ext.url, ext.label, ext.description ?? '');
          fixes.push(`EXTERNAL LINK: "${article.title}" → ${ext.url}`);
        }
      }
    }
  }

  // Trigger Cloudflare Pages rebuild if any fixes were made
  if (fixes.length > 0 && process.env.CLOUDFLARE_DEPLOY_HOOK) {
    await fetch(process.env.CLOUDFLARE_DEPLOY_HOOK, { method: 'POST' }).catch(() => {});
  }

  return NextResponse.json({ ok: true, fixCount: fixes.length, fixes });
}
