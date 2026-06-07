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
    localStorage.setItem(`outline-${id}`, JSON.stringify({ headings, seoTitle, metaDescription }));
    router.push(`/article/${id}/write`);
  };

  const addHeading = () => setHeadings(h => [...h, { level: 'H2', text: 'New heading', note: 'Add a note' }]);
  const removeHeading = (i: number) => setHeadings(h => h.filter((_, idx) => idx !== i));
  const updateText = (i: number, text: string) => setHeadings(h => h.map((hh, idx) => idx === i ? { ...hh, text } : hh));
  const updateNote = (i: number, note: string) => setHeadings(h => h.map((hh, idx) => idx === i ? { ...hh, note } : hh));

  const handleDragStart = (i: number) => setDragIndex(i);
  const handleDragOver = (e: React.DragEvent, i: number) => {
    e.preventDefault();
    if (dragOverIndex !== i) setDragOverIndex(i);
  };
  const handleDrop = (e: React.DragEvent, i: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === i) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }
    const next = [...headings];
    const [removed] = next.splice(dragIndex, 1);
    next.splice(i, 0, removed);
    setHeadings(next);
    setDragIndex(null);
    setDragOverIndex(null);
  };
  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

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
              Headings — drag to reorder · click to edit
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
                  }}
                >
                  <span className="drag-handle" title="Drag to reorder">⠿</span>
                  <span className={`h-badge ${h.level === 'H1' ? 'h1b' : 'h2b'}`}>{h.level}</span>
                  <div className="h-body">
                    <input
                      className="h-text"
                      value={h.text}
                      onChange={e => updateText(i, e.target.value)}
                      onMouseDown={e => e.stopPropagation()}
                    />
                    <input
                      className="h-note-input"
                      value={h.note}
                      onChange={e => updateNote(i, e.target.value)}
                      onMouseDown={e => e.stopPropagation()}
                      placeholder="Add a note…"
                    />
                  </div>
                  {i > 0 && (
                    <button className="btn-icon" onClick={() => removeHeading(i)} title="Remove heading">✕</button>
                  )}
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

      <style>{`
        .drag-handle {
          font-size: 16px;
          color: var(--t3);
          cursor: grab;
          padding: 0 6px 0 2px;
          user-select: none;
          flex-shrink: 0;
          line-height: 1;
        }
        .drag-handle:active { cursor: grabbing; }
        .h-note-input {
          width: 100%;
          border: none;
          background: transparent;
          font-size: 11px;
          color: var(--t3);
          font-family: inherit;
          padding: 2px 0;
          outline: none;
          cursor: text;
        }
        .h-note-input:focus {
          color: var(--t2);
          border-bottom: 1px solid var(--border);
        }
        .h-note-input::placeholder { color: var(--t3); opacity: 0.6; }
      `}</style>
    </>
  );
}
