'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import StageBar from '@/components/StageBar';
import type { SheetArticle } from '@/lib/sheets';

type Heading = { level: string; text: string; note: string };

export default function OutlineClient({ id, article }: { id: string; article: SheetArticle | null }) {
  const router = useRouter();
  const isProduct = article?.type === 'product-review' || article?.type === 'roundup';

  const [headings, setHeadings] = useState<Heading[]>([
    { level: 'H1', text: article?.title ?? 'Article title', note: 'Main title' },
  ]);
  const [seoTitle, setSeoTitle] = useState(article?.title ?? '');
  const [metaDescription, setMetaDescription] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    setGenerating(true);
    setError('');
    try {
      const res = await fetch('/api/outline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: article?.title,
          type: article?.contentType ?? article?.type,
          category: article?.category,
          keywords: article?.cluster,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to generate');
      if (data.headings) setHeadings(data.headings);
      if (data.seoTitle) setSeoTitle(data.seoTitle);
      if (data.metaDescription) setMetaDescription(data.metaDescription);
      setGenerated(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const handleApprove = () => {
    // Store outline in sessionStorage for the write page
    sessionStorage.setItem(`outline-${id}`, JSON.stringify({ headings, seoTitle, metaDescription }));
    router.push(`/article/${id}/write`);
  };

  const addHeading = () => setHeadings(h => [...h, { level: 'H2', text: 'New heading', note: 'Add a note' }]);
  const removeHeading = (i: number) => setHeadings(h => h.filter((_, idx) => idx !== i));
  const updateText = (i: number, text: string) => setHeadings(h => h.map((hh, idx) => idx === i ? { ...hh, text } : hh));

  return (
    <>
      <StageBar articleId={id} currentStage="outline" articleTitle={article?.title} isProduct={isProduct} />
      <div className="wsbody">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.09em', color: 'var(--amber)', marginBottom: 6 }}>
              Stage 1 — {generated ? 'Outline ready for review' : 'Generate outline'}
            </div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 400, maxWidth: 560, lineHeight: 1.3 }}>
              {article?.title ?? 'Article title'}
            </div>
            {article && (
              <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 4 }}>
                {article.category} · {article.contentType} · {article.competition} competition
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <Link href="/" className="btn btn-out btn-sm">← Queue</Link>
            <button className="btn btn-out btn-sm" onClick={handleGenerate} disabled={generating}>
              {generating ? '⟳ Generating…' : generated ? '↺ Re-generate' : '⚡ Generate outline'}
            </button>
            {generated && (
              <button className="btn btn-amber" onClick={handleApprove}>Approve &amp; write →</button>
            )}
          </div>
        </div>

        {error && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 'var(--r)', padding: '12px 16px', color: '#991B1B', fontSize: 13, marginBottom: 16 }}>
            ✕ {error}
          </div>
        )}

        {!generated && !generating && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: 32, textAlign: 'center', marginBottom: 20 }}>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, marginBottom: 8 }}>Ready to outline</div>
            <div style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 20 }}>
              Claude will generate an SEO-optimised outline with H1 + H2 headings, SEO title, and meta description.
            </div>
            <button className="btn btn-amber" style={{ margin: '0 auto' }} onClick={handleGenerate}>
              ⚡ Generate outline now
            </button>
          </div>
        )}

        {generating && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: 32, textAlign: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>⟳</div>
            <div style={{ fontSize: 14, color: 'var(--t2)' }}>Claude is generating your outline…</div>
          </div>
        )}

        {generated && (
          <>
            <div className="meta-grid">
              <div className="meta-card">
                <span className="lbl">SEO title</span>
                <div contentEditable suppressContentEditableWarning onBlur={e => setSeoTitle(e.currentTarget.textContent ?? '')} style={{ fontSize: 13, fontWeight: 500, outline: 'none' }}>
                  {seoTitle}
                </div>
                <div style={{ fontSize: 10, marginTop: 4 }} className={seoTitle.length >= 50 && seoTitle.length <= 60 ? 'ok' : 'warn'}>
                  {seoTitle.length} chars {seoTitle.length >= 50 && seoTitle.length <= 60 ? '✓' : '(aim for 50–60)'}
                </div>
              </div>
              <div className="meta-card">
                <span className="lbl">Meta description</span>
                <div contentEditable suppressContentEditableWarning onBlur={e => setMetaDescription(e.currentTarget.textContent ?? '')} style={{ fontSize: 12, outline: 'none' }}>
                  {metaDescription}
                </div>
                <div style={{ fontSize: 10, marginTop: 4 }} className={metaDescription.length >= 140 && metaDescription.length <= 160 ? 'ok' : 'warn'}>
                  {metaDescription.length} chars {metaDescription.length >= 140 && metaDescription.length <= 160 ? '✓' : '(aim for 140–160)'}
                </div>
              </div>
              <div className="meta-card">
                <span className="lbl">Summary</span>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{article?.contentType} · {article?.competition} competition</div>
                <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 6 }}>
                  Est. <strong>~1,800 words</strong> · {headings.length - 1} sections · {article?.category}
                </div>
              </div>
            </div>

            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.09em', color: 'var(--t3)', marginBottom: 10 }}>
              Headings — click to edit
            </div>
            <div className="headings-card">
              {headings.map((h, i) => (
                <div key={i} className="h-row">
                  <span className={`h-badge ${h.level === 'H1' ? 'h1b' : 'h2b'}`}>{h.level}</span>
                  <div className="h-body">
                    <input className="h-text" value={h.text} onChange={e => updateText(i, e.target.value)} />
                    <div className="h-note">{h.note}</div>
                  </div>
                  {i > 0 && <button className="btn-icon" onClick={() => removeHeading(i)}>✕</button>}
                </div>
              ))}
              <button className="add-h" onClick={addHeading}>+ Add heading</button>
            </div>

            <div className="approve-bar">
              <div style={{ flex: 1, fontSize: 12, color: 'var(--t2)' }}>
                ✓ Happy with the outline? Approve to write the full article.
              </div>
              <button className="btn btn-amber" onClick={handleApprove}>Approve &amp; write →</button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
