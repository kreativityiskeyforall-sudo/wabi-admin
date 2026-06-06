'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import StageBar from '@/components/StageBar';

export default function PublishPage() {
  const { id } = useParams<{ id: string }>();
  const isProduct = false;
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);

  const handlePublish = async () => {
    setPublishing(true);
    // TODO: call /api/publish — creates Sanity doc, updates Sheet
    await new Promise(r => setTimeout(r, 3000));
    setPublishing(false);
    setPublished(true);
  };

  const CHECKLIST = [
    { icon: '✓', label: 'Article written', detail: '~1,800 words · all sections complete', ok: true },
    { icon: '✓', label: 'SEO metadata', detail: 'Title 55 chars · Meta 140 chars · Keyword in H1', ok: true },
    { icon: '✓', label: 'Images', detail: '11 portrait images (1000×1500) · 3 pins + featured + 6 sections · "Pin it" button on all', ok: true },
    { icon: '✓', label: 'Pinterest pins scheduled', detail: '3 pins · spaced weekly · via Pinterest API', ok: true },
    ...(isProduct ? [{ icon: '✓', label: 'Price sparkline', detail: 'Current / 90-day high & low · auto-renders in article', ok: true }, { icon: '✓', label: 'Verdict box', detail: 'Star rating · pros/cons · editorial quote', ok: true }] : []),
    { icon: '⟳', label: 'Sanity CMS', detail: 'Will create document + upload images to CDN', ok: false },
    { icon: '⟳', label: 'Google Sheet', detail: 'Will update Status → Published · write slug + date', ok: false },
  ];

  return (
    <>
      <StageBar articleId={id} currentStage="publish" articleTitle={article?.title} isProduct={isProduct} />
      <div className="wsbody">
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.09em', color: 'var(--sage)', marginBottom: 4 }}>Stage 5 — Ready to publish</div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 400 }}>Article…</div>
        </div>

        {published ? (
          <div style={{ background: 'var(--sbg)', border: '1px solid #C8D9C0', borderRadius: 'var(--r)', padding: 28, textAlign: 'center', marginBottom: 18 }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>✓</div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 400, marginBottom: 8, color: 'var(--sage)' }}>Article is live!</div>
            <div style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 20 }}>Cloudflare Pages is rebuilding — page will be live in ~3 minutes.</div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <Link href="/" className="btn btn-sage">← Back to queue</Link>
              <a href="https://wabidecor.com" target="_blank" rel="noopener" className="btn btn-dark">↗ View live</a>
            </div>
          </div>
        ) : (
          <>
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

            <div className="pub-cta">
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 400, marginBottom: 8 }}>
                Publish to wabidecor.com
              </div>
              <div style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 22 }}>
                Article pushes to Sanity, Cloudflare rebuilds (~3 min), page goes live.
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
