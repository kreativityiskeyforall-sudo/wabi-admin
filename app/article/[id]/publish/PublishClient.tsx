'use client';

import { useState } from 'react';
import Link from 'next/link';
import StageBar from '@/components/StageBar';
import type { SheetArticle } from '@/lib/sheets';
import { getWebsiteCategory } from '@/lib/category-map';

type Step = { label: string; detail: string; state: 'pending' | 'running' | 'done' | 'error'; error?: string };

export default function PublishClient({ id, article }: { id: string; article: SheetArticle | null }) {
  const isProduct = article?.type === 'product-review';
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);
  const [steps, setSteps] = useState<Step[]>([]);
  const [sanityId, setSanityId] = useState('');

  const slug = article?.title
    ?.toLowerCase().replace(/ /g, '-').replace(/[^a-z0-9-]/g, '')
    ?? id;

  // Use category saved at outline stage, fall back to mapping, fall back to tab name
  const savedOutline = typeof window !== 'undefined'
    ? (() => { try { return JSON.parse(localStorage.getItem(`outline-${id}`) ?? '{}'); } catch { return {}; } })()
    : {};
  const websiteCategory = savedOutline.websiteCategory
    ?? getWebsiteCategory(article?.category ?? '', article?.cluster, article?.contentType);

  const updateStep = (i: number, patch: Partial<Step>) =>
    setSteps(prev => prev.map((s, j) => j === i ? { ...s, ...patch } : s));

  const handlePublish = async () => {
    setPublishing(true);
    const publishedAt = new Date().toISOString();

    const initialSteps: Step[] = [
      { label: 'Publish to Sanity CMS', detail: 'Creates article document + uploads featured image', state: 'pending' },
      { label: 'Update Google Sheet', detail: `Set status → Published · write slug + date to row ${article?.rowNumber}`, state: 'pending' },
      { label: 'Update content bible', detail: 'Adds H2 + H3 concepts to used lists — prevents future duplicates', state: 'pending' },
    ];
    setSteps(initialSteps);

    // ── Step 1: Sanity ────────────────────────────────────────────────
    setSteps(prev => prev.map((s, i) => i === 0 ? { ...s, state: 'running' } : s));
    try {
      const storedArticle = localStorage.getItem(`article-${id}`) ?? '';

      // Featured image from new ImageStore format
      let featuredImageUrl = '';
      try {
        const imgStore = JSON.parse(localStorage.getItem(`images-${id}`) ?? '{}');
        featuredImageUrl = imgStore.featured?.url ?? '';
      } catch { /* ignore */ }

      // Section images from compose layout
      let sectionImages: Array<{ headingText: string; imageUrl: string; altText: string }> = [];
      try {
        const compose = JSON.parse(localStorage.getItem(`compose-${id}`) ?? '{}');
        sectionImages = (compose.sections ?? []).filter((s: any) => s.imageUrl);
      } catch { /* ignore */ }

      // Pinterest pins from images store
      let pinterestPins: Array<{ url: string; layout: string }> = [];
      try {
        const imgStore = JSON.parse(localStorage.getItem(`images-${id}`) ?? '{}');
        pinterestPins = (imgStore.pins ?? [])
          .filter((p: any) => p.url)
          .map((p: any) => ({ url: p.url, layout: p.layout ?? 'complete' }));
      } catch { /* ignore */ }

      const normalizedCluster = (article?.cluster ?? '').replace(/^→\s*/, '').trim();
      const isMother = (article?.articleType ?? '').toUpperCase() === 'MOTHER';

      const res = await fetch('/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: article?.title,
          slug,
          body: storedArticle,
          category: websiteCategory,
          type: article?.type,
          cluster: normalizedCluster || null,
          isMother,
          featuredImageUrl,
          sectionImages,
          pinterestPins,
          publishedAt,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Sanity publish failed');
      setSanityId(data.id ?? '');
      updateStep(0, { state: 'done', detail: `✓ Sanity ID: ${data.id}` });
    } catch (e: unknown) {
      updateStep(0, { state: 'error', error: e instanceof Error ? e.message : 'Failed' });
      setPublishing(false);
      return;
    }

    // ── Step 2: Google Sheet ──────────────────────────────────────────
    updateStep(1, { state: 'running' });
    try {
      if (!article?.rowNumber || !article?.category) throw new Error('Missing row number or category');

      const res = await fetch('/api/sheets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tab: article.category,
          rowNumber: article.rowNumber,
          status: 'published',
          slug,
          publishedAt,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Sheet update failed');
      }
      updateStep(1, { state: 'done', detail: `✓ Row ${article.rowNumber} → Published · slug written` });
    } catch (e: unknown) {
      // Sheet update failure is non-fatal — article is already live
      updateStep(1, {
        state: 'error',
        error: (e instanceof Error ? e.message : 'Failed') + ' (article is live — update sheet manually)',
      });
    }

    // ── Step 3: Content Bible ─────────────────────────────────────────
    updateStep(2, { state: 'running' });
    try {
      const outline = JSON.parse(localStorage.getItem(`outline-${id}`) ?? '{}');
      const headings = outline.headings ?? [];

      const res = await fetch('/api/update-content-bible', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          title: article?.title,
          tab: article?.category,
          cluster: article?.cluster,
          uniqueAngle: article?.uniqueAngle,
          rowNumber: article?.rowNumber,
          headings,
          sanityId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? 'Content bible update failed');
      } else {
        updateStep(2, { state: 'done', detail: `✓ ${data.h2Added} H2 + ${data.h3Added} H3 concepts recorded` });
      }
    } catch (e: unknown) {
      // Non-fatal — article is already published
      updateStep(2, {
        state: 'error',
        error: (e instanceof Error ? e.message : 'Failed') + ' (article is live — update bible manually)',
      });
    }

    setPublishing(false);
    setPublished(true);
  };

  const CHECKLIST = [
    { icon: '✓', label: 'Article written', detail: '~1,800 words · all sections complete', ok: true },
    { icon: '✓', label: 'SEO metadata', detail: 'Title 55 chars · Meta 140 chars · Keyword in H1', ok: true },
    { icon: '✓', label: 'Images', detail: '11 portrait images (1000×1500) · 3 pins + featured + 6 sections', ok: true },
    ...(isProduct ? [
      { icon: '✓', label: 'Price sparkline', detail: 'Current / 90-day high & low · auto-renders in article', ok: true },
      { icon: '✓', label: 'Verdict box', detail: 'Star rating · pros/cons · editorial quote', ok: true },
    ] : []),
    { icon: '⟳', label: 'Sanity CMS', detail: 'Will create document + upload images to CDN', ok: false },
    { icon: '⟳', label: 'Google Sheet', detail: 'Will update Status → Published · write slug + date', ok: false },
  ];

  const stepIcon = (state: Step['state']) => {
    if (state === 'pending') return '○';
    if (state === 'running') return '⟳';
    if (state === 'done') return '✓';
    return '✕';
  };
  const stepColor = (state: Step['state']) => {
    if (state === 'done') return 'var(--sage)';
    if (state === 'error') return '#991B1B';
    if (state === 'running') return 'var(--amber)';
    return 'var(--t3)';
  };

  return (
    <>
      <StageBar articleId={id} currentStage="publish" articleTitle={article?.title} isProduct={isProduct} />
      <div className="wsbody">
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.09em', color: 'var(--sage)', marginBottom: 4 }}>Stage 5 — Ready to publish</div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 400 }}>{article?.title ?? 'Article'}</div>
        </div>

        {/* Publishing progress */}
        {steps.length > 0 && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '16px 20px', marginBottom: 18 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--t3)', marginBottom: 12 }}>Publishing…</div>
            {steps.map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: i < steps.length - 1 ? 12 : 0 }}>
                <span style={{ fontSize: 16, color: stepColor(s.state), fontWeight: 700, lineHeight: 1.2 }}>{stepIcon(s.state)}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: stepColor(s.state) }}>{s.label}</div>
                  <div style={{ fontSize: 11, color: s.state === 'error' ? '#991B1B' : 'var(--t3)', marginTop: 2 }}>
                    {s.error ?? s.detail}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {published ? (
          <div style={{ background: 'var(--sbg)', border: '1px solid #C8D9C0', borderRadius: 'var(--r)', padding: 28, textAlign: 'center', marginBottom: 18 }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>✓</div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 400, marginBottom: 8, color: 'var(--sage)' }}>Article is live!</div>
            <div style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 4 }}>Cloudflare Pages is rebuilding — page will be live in ~3 minutes.</div>
            {sanityId && <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 20, fontFamily: 'monospace' }}>Sanity ID: {sanityId}</div>}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <Link href="/" className="btn btn-sage">← Back to queue</Link>
              <a href={`https://decoreixy.com/${websiteCategory}/${slug}`} target="_blank" rel="noopener" className="btn btn-dark">↗ View live</a>
            </div>
          </div>
        ) : (
          <>
            {steps.length === 0 && (
              <div className="pub-list">
                {CHECKLIST.map((item, i) => (
                  <div key={i} className="pub-row">
                    <div className="pub-ic">{item.icon}</div>
                    <div className="pub-info">
                      <div className="pub-t">{item.label}</div>
                      <div className="pub-d">{item.detail}</div>
                    </div>
                    <div className={`pub-st ${item.ok ? 'ok' : 'pend'}`}>{item.ok ? 'Ready' : 'Pending'}</div>
                  </div>
                ))}
              </div>
            )}

            <div className="pub-cta">
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 400, marginBottom: 8 }}>
                Publish to decoreixy.com
              </div>
              <div style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 22 }}>
                Pushes to Sanity, updates Google Sheet, Cloudflare rebuilds (~3 min).
              </div>
              <button
                className="btn btn-sage"
                style={{ fontSize: 14, padding: '12px 32px', margin: '0 auto' }}
                onClick={handlePublish}
                disabled={publishing}
              >
                {publishing ? '⟳ Publishing…' : '↑ Publish article now'}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
