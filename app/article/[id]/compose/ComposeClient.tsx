'use client';

import { useState, useEffect } from 'react';
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
};

export type ComposeStore = { sections: Section[] };

// Parse markdown into intro + sections with full body text
function parseArticle(markdown: string): { intro: string; sections: Array<{ heading: string; body: string }> } {
  const lines = markdown.split('\n');
  const sections: Array<{ heading: string; body: string }> = [];
  let introLines: string[] = [];
  let currentHeading = '';
  let bodyLines: string[] = [];
  let seenH2 = false;

  for (const line of lines) {
    if (line.startsWith('## ')) {
      if (seenH2 && currentHeading) {
        sections.push({ heading: currentHeading, body: bodyLines.join('\n').trim() });
      }
      currentHeading = line.slice(3).trim();
      bodyLines = [];
      seenH2 = true;
    } else if (line.startsWith('# ')) {
      // skip H1
    } else {
      if (!seenH2) {
        introLines.push(line);
      } else {
        bodyLines.push(line);
      }
    }
  }
  if (seenH2 && currentHeading) {
    sections.push({ heading: currentHeading, body: bodyLines.join('\n').trim() });
  }

  return { intro: introLines.join('\n').trim(), sections };
}

// Render a block of markdown text into simple paragraphs (strip markdown syntax)
function renderBody(text: string) {
  if (!text) return null;
  return text.split(/\n\n+/).filter(Boolean).map((para, i) => {
    if (para.startsWith('### ')) return <h3 key={i} className="preview-h3">{para.slice(4)}</h3>;
    const clean = para.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1').replace(/^[-*] /, '').trim();
    if (!clean) return null;
    return <p key={i} className="preview-p">{clean}</p>;
  });
}

function buildAltText(headingText: string, category: string, articleTitle: string): string {
  const clean = headingText.replace(/^(idea\s+\d+[:.]\s*|tip\s+\d+[:.]\s*|\d+[:.]\s*)/i, '').trim();
  return `${clean} – Japandi ${category.replace('-', ' ')} decor · ${articleTitle}`;
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

    // Try to restore saved compose layout first
    if (savedCompose) {
      try {
        const saved = JSON.parse(savedCompose);
        // Re-merge with latest article parse to pick up any text changes
        const merged: Section[] = parsedSections.map((p, i) => {
          const existing = saved.sections?.[i];
          return {
            headingText: p.heading,
            bodyText: p.body,
            imageUrl: existing?.imageUrl ?? null,
            altText: existing?.altText ?? buildAltText(p.heading, category, articleTitle),
          };
        });
        setSections(merged);
        setLoaded(true);
        return;
      } catch { /* rebuild */ }
    }

    // Build fresh from images store
    let store: ImageStore | null = null;
    if (imagesRaw) {
      try { store = JSON.parse(imagesRaw); } catch { /* ignore */ }
    }

    const built: Section[] = parsedSections.map((p, i) => ({
      headingText: p.heading,
      bodyText: p.body,
      imageUrl: store?.sections?.[i]?.url ?? null,
      altText: buildAltText(p.heading, category, articleTitle),
    }));

    setSections(built);
    setLoaded(true);
  }, [id, category, articleTitle]);

  const save = (next: Section[]) => {
    localStorage.setItem(`compose-${id}`, JSON.stringify({ sections: next }));
  };

  const handleApprove = (dest: 'pinterest' | 'publish') => {
    save(sections);
    router.push(`/article/${id}/${dest}`);
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
              Stage 4 — Compose layout
            </div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 400 }}>{articleTitle}</div>
            <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 3 }}>
              {sections.length} sections · {imagesAssigned} images — drag thumbnails on the right to reorder
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <Link href={`/article/${id}/images`} className="btn btn-out btn-sm">← Images</Link>
            <button className="btn btn-out btn-sm" onClick={() => handleApprove('pinterest')} disabled={!loaded}>
              → Pinterest
            </button>
            <button className="btn btn-sage" onClick={() => handleApprove('publish')} disabled={!loaded}>
              Skip Pinterest — Publish →
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
                    <h2 className="preview-h2">{s.headingText}</h2>
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
                    <div className="arrange-info">
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--t1)', lineHeight: 1.3 }}>
                        {s.headingText.length > 45 ? s.headingText.slice(0, 45) + '…' : s.headingText}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--t3)', marginTop: 2 }}>
                        {s.imageUrl ? 'Image assigned' : 'No image'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button className="btn btn-sage" style={{ width: '100%', justifyContent: 'center' }} onClick={() => handleApprove('pinterest')}>
                  Approve — go to Pinterest →
                </button>
                <button className="btn btn-dark" style={{ width: '100%', justifyContent: 'center' }} onClick={() => handleApprove('publish')}>
                  Skip Pinterest — publish now →
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
