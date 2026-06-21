'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import StageBar from '@/components/StageBar';
import type { SheetArticle } from '@/lib/sheets';
import type { ImageStore } from '../images/ImagesClient';

type Section = {
  headingText: string;
  bodyText: string;
  imageUrl: string | null;
  altText: string;
  level?: 'H2' | 'H3';
};

export type ComposeStore = { sections: Section[] };

// Parse markdown into intro + sections with full body text (H2 and H3)
function parseArticle(markdown: string): { intro: string; sections: Array<{ heading: string; body: string; level: 'H2' | 'H3' }> } {
  const lines = markdown.split('\n');
  const sections: Array<{ heading: string; body: string; level: 'H2' | 'H3' }> = [];
  let introLines: string[] = [];
  let currentHeading = '';
  let currentLevel: 'H2' | 'H3' | '' = '';
  let bodyLines: string[] = [];
  let seenHeading = false;

  const flush = () => {
    if (seenHeading && currentHeading && currentLevel) {
      sections.push({ heading: currentHeading, body: bodyLines.join('\n').trim(), level: currentLevel as 'H2' | 'H3' });
    }
  };

  for (const line of lines) {
    if (line.startsWith('### ')) {
      flush();
      currentHeading = line.slice(4).trim();
      currentLevel = 'H3';
      bodyLines = [];
      seenHeading = true;
    } else if (line.startsWith('## ')) {
      flush();
      currentHeading = line.slice(3).trim();
      currentLevel = 'H2';
      bodyLines = [];
      seenHeading = true;
    } else if (line.startsWith('# ')) {
      // skip H1
    } else {
      if (!seenHeading) introLines.push(line);
      else bodyLines.push(line);
    }
  }
  flush();

  return { intro: introLines.join('\n').trim(), sections };
}

// Normalize heading for fuzzy matching (strip leading numbers, lowercase, strip punctuation)
function normalizeHeading(text: string): string {
  return text
    .replace(/^(idea\s+\d+[:.]\s*|tip\s+\d+[:.]\s*|#\d+\s*[:.]\s*|\d+[:.]\s*)/i, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Render inline markdown (bold, italic, links) as React nodes
function renderInline(text: string, paraKey: number): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/);
  return parts.map((part, j) => {
    if (!part) return null;
    if (part.startsWith('**') && part.endsWith('**'))
      return <strong key={`${paraKey}-${j}`}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('*') && part.endsWith('*') && !part.startsWith('**'))
      return <em key={`${paraKey}-${j}`}>{part.slice(1, -1)}</em>;
    const lm = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (lm)
      return <a key={`${paraKey}-${j}`} href={lm[2]} target="_blank" rel="noopener" style={{ color: 'var(--sage)', textDecoration: 'underline' }}>{lm[1]}</a>;
    return <span key={`${paraKey}-${j}`}>{part}</span>;
  });
}

// Render a block of markdown text into paragraphs with working links
function renderBody(text: string) {
  if (!text) return null;
  return text.split(/\n\n+/).filter(Boolean).map((para, i) => {
    if (para.startsWith('### ')) return <h3 key={i} className="preview-h3">{para.slice(4)}</h3>;
    const stripped = para.replace(/^[-*] /, '').trim();
    if (!stripped) return null;
    return <p key={i} className="preview-p">{renderInline(stripped, i)}</p>;
  });
}

const STYLE_LABELS: Record<string, string> = {
  japandi: 'Japandi', coastal: 'Coastal', 'modern-farmhouse': 'Modern Farmhouse',
  boho: 'Boho', scandinavian: 'Scandinavian', cottagecore: 'Cottagecore',
  'mid-century-modern': 'Mid-Century Modern', general: 'home', garden: 'garden',
  'global-styles': 'global styles', seasonal: 'seasonal', guides: 'home',
  bedroom: 'Japandi', 'living-room': 'Japandi', bathroom: 'Japandi', kitchen: 'Japandi',
};

function buildAltText(headingText: string, category: string, articleTitle: string): string {
  const clean = headingText.replace(/^(idea\s+\d+[:.]\s*|tip\s+\d+[:.]\s*|\d+[:.]\s*)/i, '').trim();
  const styleLabel = STYLE_LABELS[category] ?? category.replace(/-/g, ' ');
  return `${clean} – ${styleLabel} ${category.replace(/-/g, ' ')} decor · ${articleTitle}`;
}

export default function ComposeClient({ id, article }: { id: string; article: SheetArticle | null }) {
  const router = useRouter();
  const isProduct = article?.type === 'product-review';
  const category = article?.category?.toLowerCase().replace(/ /g, '-') ?? 'living-room';
  const articleTitle = article?.title ?? '';

  const [sections, setSections] = useState<Section[]>([]);
  const [intro, setIntro] = useState('');
  const [featuredUrl, setFeaturedUrl] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [shopBlockMap, setShopBlockMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const articleRaw = localStorage.getItem(`article-${id}`) ?? '';
    const imagesRaw = localStorage.getItem(`images-${id}`);
    const savedCompose = localStorage.getItem(`compose-${id}`);

    const { intro: parsedIntro, sections: parsedSections } = parseArticle(articleRaw);
    setIntro(parsedIntro);

    // Load featured image
    if (imagesRaw) {
      try {
        const imgStore = JSON.parse(imagesRaw);
        setFeaturedUrl(imgStore.featured?.url ?? null);
      } catch { /* ignore */ }
    }

    // Load shop blocks
    let shopBlockMapBuilt: Record<string, boolean> = {};
    try {
      const shopData = JSON.parse(localStorage.getItem(`shop-${id}`) ?? '{}');
      for (const b of shopData.blocks ?? []) {
        if (b.afterHeading) shopBlockMapBuilt[b.afterHeading] = true;
      }
    } catch { /* ignore */ }
    setShopBlockMap(shopBlockMapBuilt);

    // Build image URL maps — exact, normalized, and positional fallback
    let imgMapExact: Record<string, string | null> = {};
    let imgMapNorm: Record<string, string | null> = {};
    let imgByIndex: (string | null)[] = [];
    if (imagesRaw) {
      try {
        const imgStore: ImageStore = JSON.parse(imagesRaw);
        for (const s of imgStore.sections ?? []) {
          if (s.headingText) {
            imgMapExact[s.headingText] = s.url ?? null;
            imgMapNorm[normalizeHeading(s.headingText)] = s.url ?? null;
          }
          imgByIndex.push(s.url ?? null);
        }
      } catch { /* ignore */ }
    }
    const resolveImg = (heading: string, idx: number): string | null =>
      imgMapExact[heading] ?? imgMapNorm[normalizeHeading(heading)] ?? imgByIndex[idx] ?? null;

    // Try to restore saved compose layout first
    if (savedCompose) {
      try {
        const saved = JSON.parse(savedCompose);
        // Re-merge with latest article parse to pick up any text changes
        const savedMap = Object.fromEntries(
          (saved.sections ?? []).map((s: Section) => [s.headingText, s])
        );
        const merged: Section[] = parsedSections.map((p, idx) => {
          const existing = savedMap[p.heading];
          return {
            headingText: p.heading,
            bodyText: p.body,
            level: p.level,
            imageUrl: existing?.imageUrl ?? resolveImg(p.heading, idx),
            altText: existing?.altText ?? buildAltText(p.heading, category, articleTitle),
          };
        });
        setSections(merged);
        setLoaded(true);
        localStorage.setItem(`compose-${id}`, JSON.stringify({ sections: merged }));
        return;
      } catch { /* rebuild */ }
    }

    // Build fresh from images store
    const built: Section[] = parsedSections.map((p, idx) => ({
      headingText: p.heading,
      bodyText: p.body,
      level: p.level,
      imageUrl: resolveImg(p.heading, idx),
      altText: buildAltText(p.heading, category, articleTitle),
    }));

    setSections(built);
    setLoaded(true);
    localStorage.setItem(`compose-${id}`, JSON.stringify({ sections: built }));
  }, [id, category, articleTitle]);

  const save = (next: Section[]) => {
    localStorage.setItem(`compose-${id}`, JSON.stringify({ sections: next }));
  };

  const handleApprove = () => {
    save(sections);
    router.push(`/article/${id}/publish`);
  };

  // Drag images between section slots (only swaps imageUrl/altText, heading+body stay fixed)
  const handleDragStart = (i: number) => setDragIndex(i);
  const handleDragOver = (e: React.DragEvent, i: number) => { e.preventDefault(); setDragOverIndex(i); };
  const handleDrop = (e: React.DragEvent, i: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === i) { setDragIndex(null); setDragOverIndex(null); return; }
    const next = sections.map((s, idx) => {
      if (idx === i)         return { ...s, imageUrl: sections[dragIndex].imageUrl, altText: sections[dragIndex].altText };
      if (idx === dragIndex) return { ...s, imageUrl: sections[i].imageUrl, altText: sections[i].altText };
      return s;
    });
    setSections(next);
    setDragIndex(null);
    setDragOverIndex(null);
  };
  const handleDragEnd = () => { setDragIndex(null); setDragOverIndex(null); };

  const imagesAssigned = sections.filter(s => s.imageUrl).length;

  return (
    <>
      <StageBar articleId={id} currentStage="compose" articleTitle={article?.title} isProduct={isProduct} />
      <div className="wsbody">

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.09em', color: 'var(--sage)', marginBottom: 4 }}>
              Stage 5 — Compose layout
            </div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 400 }}>{articleTitle}</div>
            <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 3 }}>
              {sections.length} sections · {imagesAssigned} images — drag thumbnails on the right to reorder
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <Link href={`/article/${id}/shop`} className="btn btn-out btn-sm">← Shop</Link>
            <button className="btn btn-sage" onClick={handleApprove} disabled={!loaded}>
              Publish →
            </button>
          </div>
        </div>

        {!loaded && <div style={{ textAlign: 'center', padding: 40, color: 'var(--t3)' }}>Loading…</div>}

        {loaded && (
          <div className="compose-layout">

            {/* LEFT: full article preview */}
            <div className="compose-preview-panel">
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.09em', color: 'var(--t3)', marginBottom: 14 }}>
                Article preview — this is how it will look on the site
              </div>

              <div className="article-preview-body">
                <h1 className="preview-h1">{articleTitle}</h1>

                {/* Featured image */}
                {featuredUrl && (
                  <div className="preview-featured-wrap">
                    <img src={featuredUrl} alt={articleTitle} className="preview-featured-img" />
                    <div className="preview-img-label">Featured image</div>
                  </div>
                )}

                {/* Intro */}
                {renderBody(intro)}

                {/* Sections */}
                {sections.map((s, i) => (
                  <div key={i} className="preview-section">
                    {s.level === 'H3'
                      ? <h3 className="preview-h3">{s.headingText}</h3>
                      : <h2 className="preview-h2">{s.headingText}</h2>
                    }
                    {s.imageUrl && (
                      <div className="preview-img-wrap">
                        <img
                          src={s.imageUrl}
                          alt={s.altText}
                          className="preview-img"
                        />
                        <div className="preview-img-label">Image {i + 1}</div>
                      </div>
                    )}
                    {!s.imageUrl && (
                      <div className="preview-img-empty">No image assigned for this section</div>
                    )}
                    {renderBody(s.bodyText)}
                    {shopBlockMap[s.headingText] && (
                      <div style={{ background: '#eef2ef', border: '2px solid #5a9e8a', borderRadius: 8, padding: '14px 16px', margin: '16px 0', textAlign: 'center' }}>
                        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#3d7a68', marginBottom: 4 }}>✦ Shop The Look</div>
                        <div style={{ fontSize: 11, color: '#888' }}>Product cards will appear here</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* RIGHT: arrangement panel */}
            <div className="compose-arrange-panel">
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.09em', color: 'var(--t3)', marginBottom: 12 }}>
                Drag images to reorder
              </div>
              <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 14, lineHeight: 1.5 }}>
                Grab an image and drag it to a different section to swap positions. The article preview updates live.
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {sections.map((s, i) => (
                  <div
                    key={i}
                    className="arrange-row"
                    draggable={!!s.imageUrl}
                    onDragStart={() => handleDragStart(i)}
                    onDragOver={e => handleDragOver(e, i)}
                    onDrop={e => handleDrop(e, i)}
                    onDragEnd={handleDragEnd}
                    style={{
                      opacity: dragIndex === i ? 0.35 : 1,
                      borderTop: dragOverIndex === i && dragIndex !== i ? '2px solid var(--sage)' : '2px solid transparent',
                      cursor: s.imageUrl ? 'grab' : 'default',
                      transition: 'opacity .15s, border-color .1s',
                    }}
                  >
                    <span className="arrange-handle" style={{ visibility: s.imageUrl ? 'visible' : 'hidden' }}>⠿</span>
                    <div className="arrange-thumb">
                      {s.imageUrl
                        ? <img src={s.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 3 }} />
                        : <span style={{ fontSize: 9, color: 'var(--t3)' }}>—</span>
                      }
                    </div>
                    <div className="arrange-info" style={{ paddingLeft: s.level === 'H3' ? 10 : 0 }}>
                      <div style={{ fontSize: 11, fontWeight: s.level === 'H3' ? 400 : 600, color: s.level === 'H3' ? 'var(--t2)' : 'var(--t1)', lineHeight: 1.3 }}>
                        {s.level === 'H3' ? '↳ ' : ''}{s.headingText.length > 42 ? s.headingText.slice(0, 42) + '…' : s.headingText}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--t3)', marginTop: 2 }}>
                        {s.imageUrl ? 'Image assigned' : 'No image'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 20 }}>
                <button className="btn btn-sage" style={{ width: '100%', justifyContent: 'center' }} onClick={handleApprove}>
                  Approve layout — Publish →
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .compose-layout {
          display: grid;
          grid-template-columns: 1fr 300px;
          gap: 24px;
          align-items: start;
        }
        .compose-preview-panel {
          min-width: 0;
        }
        .compose-arrange-panel {
          position: sticky;
          top: 16px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--r);
          padding: 16px;
          max-height: 90vh;
          overflow-y: auto;
        }
        /* Article preview styles */
        .article-preview-body {
          background: white;
          border: 1px solid var(--border);
          border-radius: var(--r);
          padding: 32px 40px;
          font-family: var(--font-sans, system-ui, sans-serif);
        }
        .preview-h1 {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 26px;
          font-weight: 400;
          color: #1A1A18;
          margin: 0 0 20px;
          line-height: 1.3;
          text-decoration: underline;
          text-decoration-color: #B87355;
          text-decoration-thickness: 2px;
          text-underline-offset: 6px;
        }
        .preview-h2 {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 20px;
          font-weight: 400;
          color: #1A1A18;
          margin: 32px 0 14px;
          line-height: 1.3;
          text-decoration: underline;
          text-decoration-color: #C8875A;
          text-decoration-thickness: 1.5px;
          text-underline-offset: 5px;
        }
        .preview-h3 {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 15px;
          font-weight: 400;
          color: #3A3A38;
          margin: 20px 0 8px;
        }
        .preview-p {
          font-size: 14px;
          line-height: 1.75;
          color: #3A3A38;
          margin: 0 0 14px;
        }
        .preview-featured-wrap {
          position: relative;
          width: 100%;
          aspect-ratio: 3/2;
          border-radius: 8px;
          overflow: hidden;
          margin: 0 0 20px;
        }
        .preview-featured-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .preview-section { margin-bottom: 8px; }
        .preview-img-wrap {
          max-width: 300px;
          width: 100%;
          aspect-ratio: 2/3;
          border-radius: 6px;
          overflow: hidden;
          margin: 12px auto 16px;
          position: relative;
        }
        .preview-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .preview-img-label {
          position: absolute;
          top: 8px;
          left: 8px;
          background: rgba(0,0,0,0.5);
          color: white;
          font-size: 10px;
          padding: 2px 6px;
          border-radius: 3px;
        }
        .preview-img-empty {
          background: var(--sbg);
          border: 1.5px dashed var(--border);
          border-radius: 6px;
          padding: 20px;
          text-align: center;
          font-size: 11px;
          color: var(--t3);
          margin: 12px 0 16px;
        }
        /* Arrange panel */
        .arrange-row {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px;
          background: var(--sbg);
          border: 1px solid var(--border);
          border-radius: var(--r);
        }
        .arrange-handle {
          font-size: 14px;
          color: var(--t3);
          flex-shrink: 0;
          user-select: none;
        }
        .arrange-thumb {
          width: 36px;
          height: 52px;
          border-radius: 3px;
          overflow: hidden;
          flex-shrink: 0;
          background: var(--border);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .arrange-info { flex: 1; min-width: 0; }
        @media (max-width: 900px) {
          .compose-layout { grid-template-columns: 1fr; }
          .compose-arrange-panel { position: static; }
        }
      ` }} />
    </>
  );
}
