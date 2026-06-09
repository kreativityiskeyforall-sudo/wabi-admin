'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import StageBar from '@/components/StageBar';
import type { SheetArticle } from '@/lib/sheets';
import { getWebsiteCategory, WEBSITE_CATEGORIES } from '@/lib/category-map';

type Heading = { level: string; text: string; note: string; concept: string };
type BibleCheck = {
  articleAlreadyExists: boolean;
  rejectedH2Concepts: string[];
  rejectedH3Concepts: string[];
  cleanBill: boolean;
};

export default function OutlineClient({ id, article }: { id: string; article: SheetArticle | null }) {
  const router = useRouter();
  const isProduct = article?.type === 'product-review' || article?.type === 'roundup';

  const [headings, setHeadings] = useState<Heading[]>([
    { level: 'H1', text: article?.title ?? 'Article title', note: 'Main title', concept: '' },
  ]);
  const [seoTitle, setSeoTitle] = useState(article?.title ?? '');
  const [metaDescription, setMetaDescription] = useState('');
  const [bibleCheck, setBibleCheck] = useState<BibleCheck | null>(null);
  const [websiteCategory, setWebsiteCategory] = useState(
    () => getWebsiteCategory(article?.category ?? '', article?.cluster, article?.contentType)
  );
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [error, setError] = useState('');

  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleGenerate = async () => {
    setGenerating(true);
    setError('');
    try {
      const res = await fetch('/api/outline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: article?.title,
          contentType: article?.contentType ?? article?.type,
          category: article?.category,
          cluster: article?.cluster,
          uniqueAngle: article?.uniqueAngle,
          competition: article?.competition,
          priority: article?.priority,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to generate');
      if (data.headings) setHeadings(data.headings);
      if (data.seoTitle) setSeoTitle(data.seoTitle);
      if (data.metaDescription) setMetaDescription(data.metaDescription);
      if (data.contentBibleCheck) setBibleCheck(data.contentBibleCheck);
      setGenerated(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const handleApprove = () => {
    localStorage.setItem(`outline-${id}`, JSON.stringify({ headings, seoTitle, metaDescription, websiteCategory }));
    router.push(`/article/${id}/write`);
  };

  const addHeading = (level: 'H2' | 'H3') =>
    setHeadings(h => [...h, { level, text: 'New heading', note: 'Add a note', concept: '' }]);
  const removeHeading = (i: number) => setHeadings(h => h.filter((_, idx) => idx !== i));
  const updateField = (i: number, field: keyof Heading, value: string) =>
    setHeadings(h => h.map((hh, idx) => idx === i ? { ...hh, [field]: value } : hh));
  const toggleLevel = (i: number) =>
    setHeadings(h => h.map((hh, idx) => idx === i ? { ...hh, level: hh.level === 'H2' ? 'H3' : 'H2' } : hh));

  const handleDragStart = (i: number) => setDragIndex(i);
  const handleDragOver = (e: React.DragEvent, i: number) => {
    e.preventDefault();
    if (dragOverIndex !== i) setDragOverIndex(i);
  };
  const handleDrop = (e: React.DragEvent, i: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === i) { setDragIndex(null); setDragOverIndex(null); return; }
    const next = [...headings];
    const [removed] = next.splice(dragIndex, 1);
    next.splice(i, 0, removed);
    setHeadings(next);
    setDragIndex(null);
    setDragOverIndex(null);
  };
  const handleDragEnd = () => { setDragIndex(null); setDragOverIndex(null); };

  const h2Count = headings.filter(h => h.level === 'H2').length;
  const h3Count = headings.filter(h => h.level === 'H3').length;

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
                {article.category} · {article.contentType} · {article.competition} competition · {article.priority}
              </div>
            )}
            {article?.uniqueAngle && (
              <div style={{ fontSize: 11, color: 'var(--t2)', marginTop: 6, maxWidth: 560, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '6px 10px' }}>
                <span style={{ fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', fontSize: 9, letterSpacing: '.08em' }}>Unique Angle · </span>
                {article.uniqueAngle}
              </div>
            )}
            <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--t3)' }}>Publishes to</span>
              <select
                value={websiteCategory}
                onChange={e => setWebsiteCategory(e.target.value)}
                style={{ fontSize: 11, fontFamily: 'inherit', border: '1px solid var(--border)', borderRadius: 'var(--r)', background: 'var(--surface)', color: 'var(--t1)', padding: '3px 8px', cursor: 'pointer' }}
              >
                {WEBSITE_CATEGORIES.map(c => (
                  <option key={c.slug} value={c.slug}>/{c.slug} — {c.label}</option>
                ))}
              </select>
            </div>
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

        {/* Content Bible Check panel */}
        {bibleCheck && (
          <div style={{
            background: bibleCheck.cleanBill && !bibleCheck.articleAlreadyExists ? '#F0FDF4' : '#FEF9EC',
            border: `1px solid ${bibleCheck.cleanBill && !bibleCheck.articleAlreadyExists ? '#BBF7D0' : '#FCD34D'}`,
            borderRadius: 'var(--r)', padding: '12px 16px', marginBottom: 16, fontSize: 12,
          }}>
            <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.08em' }}>
              Content Bible Check
            </div>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <span>{bibleCheck.articleAlreadyExists ? '⚠ Article already exists — do not publish' : '✓ Article is new'}</span>
              <span>{bibleCheck.cleanBill ? '✓ No duplicate concepts' : '⚠ Some concepts were rejected'}</span>
            </div>
            {bibleCheck.rejectedH2Concepts.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <strong>Rejected H2 concepts:</strong>
                <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                  {bibleCheck.rejectedH2Concepts.map((c, i) => <li key={i}>{c}</li>)}
                </ul>
              </div>
            )}
            {bibleCheck.rejectedH3Concepts.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <strong>Rejected H3 concepts:</strong>
                <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                  {bibleCheck.rejectedH3Concepts.map((c, i) => <li key={i}>{c}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}

        {!generated && !generating && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: 32, textAlign: 'center', marginBottom: 20 }}>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, marginBottom: 8 }}>Ready to outline</div>
            <div style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 20 }}>
              Claude will check the content bible, then generate a deduplicated outline with H1, H2, and H3 headings.
            </div>
            <button className="btn btn-amber" style={{ margin: '0 auto' }} onClick={handleGenerate}>
              ⚡ Generate outline now
            </button>
          </div>
        )}

        {generating && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: 32, textAlign: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>⟳</div>
            <div style={{ fontSize: 14, color: 'var(--t2)' }}>Claude is checking the content bible and generating your outline…</div>
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
                  {h2Count} H2s · {h3Count} H3s · {article?.category}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.09em', color: 'var(--t3)' }}>
                Headings — drag to reorder · click to edit · toggle H2/H3
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn btn-out btn-sm" onClick={() => addHeading('H2')}>+ H2</button>
                <button className="btn btn-out btn-sm" onClick={() => addHeading('H3')}>+ H3</button>
              </div>
            </div>

            <div className="headings-card">
              {headings.map((h, i) => (
                <div
                  key={i}
                  className="h-row"
                  draggable
                  onDragStart={() => handleDragStart(i)}
                  onDragOver={e => handleDragOver(e, i)}
                  onDrop={e => handleDrop(e, i)}
                  onDragEnd={handleDragEnd}
                  style={{
                    opacity: dragIndex === i ? 0.4 : 1,
                    borderTop: dragOverIndex === i && dragIndex !== i ? '2px solid var(--amber)' : '2px solid transparent',
                    transition: 'border-color .1s, opacity .1s',
                    cursor: 'grab',
                    paddingLeft: h.level === 'H3' ? 32 : undefined,
                  }}
                >
                  <span className="drag-handle" title="Drag to reorder">⠿</span>
                  <button
                    className={`h-badge ${h.level === 'H1' ? 'h1b' : h.level === 'H3' ? 'h3b' : 'h2b'}`}
                    style={{ cursor: h.level !== 'H1' ? 'pointer' : 'default', border: 'none', fontFamily: 'inherit' }}
                    onClick={() => h.level !== 'H1' && toggleLevel(i)}
                    title={h.level !== 'H1' ? 'Click to toggle H2/H3' : undefined}
                  >
                    {h.level}
                  </button>
                  <div className="h-body">
                    <input
                      className="h-text"
                      value={h.text}
                      onChange={e => updateField(i, 'text', e.target.value)}
                      onMouseDown={e => e.stopPropagation()}
                    />
                    <input
                      className="h-note-input"
                      value={h.note}
                      onChange={e => updateField(i, 'note', e.target.value)}
                      onMouseDown={e => e.stopPropagation()}
                      placeholder="Add a note…"
                    />
                  </div>
                  {i > 0 && (
                    <button className="btn-icon" onClick={() => removeHeading(i)} title="Remove heading">✕</button>
                  )}
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8, padding: '8px 12px' }}>
                <button className="add-h" style={{ flex: 1 }} onClick={() => addHeading('H2')}>+ Add H2</button>
                <button className="add-h" style={{ flex: 1 }} onClick={() => addHeading('H3')}>+ Add H3</button>
              </div>
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

      <style>{`
        .drag-handle {
          font-size: 16px; color: var(--t3); cursor: grab; padding: 0 6px 0 2px;
          user-select: none; flex-shrink: 0; line-height: 1;
        }
        .drag-handle:active { cursor: grabbing; }
        .h-note-input {
          width: 100%; border: none; background: transparent; font-size: 11px;
          color: var(--t3); font-family: inherit; padding: 2px 0; outline: none; cursor: text;
        }
        .h-note-input:focus { color: var(--t2); border-bottom: 1px solid var(--border); }
        .h-note-input::placeholder { color: var(--t3); opacity: 0.6; }
        .h3b {
          background: #EFF6FF; color: #1D4ED8; font-size: 9px; font-weight: 700;
          padding: 2px 5px; border-radius: 3px; flex-shrink: 0;
        }
      `}</style>
    </>
  );
}
