'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import StageBar from '@/components/StageBar';
import { getArticle } from '@/lib/mock-data';

const DEFAULT_HEADINGS = [
  { level: 'H1', text: '15 Japandi Living Room DIY Hacks That Cost Almost Nothing', note: 'Main title · 55 chars' },
  { level: 'H2', text: '1. Replace metal handles with wooden ones', note: 'Quick win, high visual impact, £15 DIY' },
  { level: 'H2', text: '2. Add a low slatted wooden coffee table', note: 'Low furniture = core Japandi signal' },
  { level: 'H2', text: '3. Use linen throws instead of blankets', note: 'Material swap, under £30' },
  { level: 'H2', text: '4. Paper shoji-style window screens', note: 'Privacy + diffused light' },
  { level: 'H2', text: '5. Build a simple floating shelf for ceramics', note: 'Display curated objects' },
  { level: 'H2', text: '6. Paint one wall in a muted clay tone', note: 'Colour as backdrop' },
  { level: 'H2', text: '7. Bundle dried grasses into a tall ceramic vase', note: '$0 from a field or hedgerow' },
  { level: 'H2', text: '8. Replace overhead light with a washi paper pendant', note: 'Lighting mood, £20–£35' },
];

export default function OutlinePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const article = getArticle(id);
  const [headings, setHeadings] = useState(DEFAULT_HEADINGS);
  const [generating, setGenerating] = useState(false);

  const addHeading = () => {
    setHeadings(h => [...h, { level: 'H2', text: 'New heading', note: 'Add a brief note' }]);
  };

  const removeHeading = (i: number) => {
    setHeadings(h => h.filter((_, idx) => idx !== i));
  };

  const updateText = (i: number, text: string) => {
    setHeadings(h => h.map((hh, idx) => idx === i ? { ...hh, text } : hh));
  };

  const handleGenerate = async () => {
    setGenerating(true);
    // TODO: call /api/outline with article data from Sheet
    await new Promise(r => setTimeout(r, 1500));
    setGenerating(false);
  };

  return (
    <>
      <StageBar articleId={id} currentStage="outline" articleTitle={article?.title} />
      <div className="wsbody">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.09em', color: 'var(--amber)', marginBottom: 6 }}>
              ● Stage 1 — Outline ready for your review
            </div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 400, maxWidth: 560, lineHeight: 1.3 }}>
              {article?.title ?? 'Article title'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <Link href="/" className="btn btn-out btn-sm">← Queue</Link>
            <button className="btn btn-out btn-sm" onClick={handleGenerate} disabled={generating}>
              {generating ? '⟳ Generating…' : '↺ Re-generate'}
            </button>
            <Link href={`/article/${id}/write`} className="btn btn-amber">Approve &amp; write →</Link>
          </div>
        </div>

        {/* Meta cards */}
        <div className="meta-grid">
          <div className="meta-card">
            <span className="lbl">SEO title</span>
            <div contentEditable suppressContentEditableWarning style={{ fontSize: 13, fontWeight: 500, outline: 'none' }}>
              15 Japandi Living Room DIY Hacks That Cost Almost Nothing
            </div>
            <div style={{ fontSize: 10, marginTop: 4 }} className="ok">✓ 55 chars</div>
          </div>
          <div className="meta-card">
            <span className="lbl">Meta description</span>
            <div contentEditable suppressContentEditableWarning style={{ fontSize: 12, outline: 'none' }}>
              Transform your living room with these 15 affordable Japandi DIY hacks that each take a weekend or less.
            </div>
            <div style={{ fontSize: 10, marginTop: 4 }} className="ok">✓ 140 chars</div>
          </div>
          <div className="meta-card">
            <span className="lbl">Summary</span>
            <div style={{ fontSize: 13, fontWeight: 500 }}>Hacks · Low competition</div>
            <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 6 }}>
              Est. <strong>~1,900 words</strong> · {headings.length - 1} sections · Living Room cluster
            </div>
          </div>
        </div>

        {/* Headings */}
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.09em', color: 'var(--t3)', marginBottom: 10 }}>
          Headings — click to edit · drag to reorder
        </div>
        <div className="headings-card">
          {headings.map((h, i) => (
            <div key={i} className="h-row">
              {i === 0
                ? <span style={{ fontSize: 12, color: 'var(--t3)', flexShrink: 0, width: 18 }}>·</span>
                : <span className="h-drag">⠿</span>
              }
              <span className={`h-badge ${h.level === 'H1' ? 'h1b' : 'h2b'}`}>{h.level}</span>
              <div className="h-body">
                <input
                  className="h-text"
                  value={h.text}
                  onChange={e => updateText(i, e.target.value)}
                />
                <div className="h-note">{h.note}</div>
              </div>
              <div className="h-acts">
                {i > 0 && (
                  <button className="btn-icon" onClick={() => removeHeading(i)}>✕</button>
                )}
              </div>
            </div>
          ))}
          <button className="add-h" onClick={addHeading}>+ Add heading</button>
        </div>

        <div className="approve-bar">
          <div style={{ flex: 1, fontSize: 12, color: 'var(--t2)' }}>
            ✓ Happy with the outline? Approve to expand into full article — each heading becomes 2–3 paragraphs.
          </div>
          <Link href={`/article/${id}/write`} className="btn btn-amber">Approve &amp; write →</Link>
        </div>
      </div>
    </>
  );
}
