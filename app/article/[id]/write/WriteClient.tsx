'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import StageBar from '@/components/StageBar';
import type { SheetArticle } from '@/lib/sheets';

type Heading = { level: string; text: string; note: string };
type InternalArticle = { title: string; category: string; slug: string };
type Selection = { start: number; end: number; text: string };

export default function WriteClient({ id, article }: { id: string; article: SheetArticle | null }) {
  const isProduct = article?.type === 'product-review' || article?.type === 'roundup';

  const [writing, setWriting] = useState(false);
  const [done, setDone] = useState(false);
  const [articleText, setArticleText] = useState('');
  const [error, setError] = useState('');
  const [step, setStep] = useState(0);
  const [outline, setOutline] = useState<{ headings: Heading[]; uniqueAngle?: string } | null>(null);
  const [wordCount, setWordCount] = useState(1800);

  // Link tool state
  const [selection, setSelection] = useState<Selection | null>(null);
  const [linkMode, setLinkMode] = useState<'external' | 'internal' | null>(null);
  const [linkUrl, setLinkUrl] = useState('');
  const [internalSearch, setInternalSearch] = useState('');
  const [internalResults, setInternalResults] = useState<InternalArticle[]>([]);
  const [searching, setSearching] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(`outline-${id}`);
    if (stored) setOutline(JSON.parse(stored));
    const savedArticle = localStorage.getItem(`article-${id}`);
    if (savedArticle) { setArticleText(savedArticle); setDone(true); setStep(5); }
  }, [id]);

  const steps = isProduct
    ? ['Reading product brief', 'Writing introduction', 'Writing design & features', 'Writing pros/cons', 'Writing verdict', 'SEO check']
    : ['Reading outline', 'Writing introduction', 'Writing sections 1–4', 'Writing sections 5–8', 'Writing final sections', 'SEO check'];

  const handleWrite = async () => {
    setWriting(true);
    setError('');
    setStep(0);

    const tick = setInterval(() => setStep(s => Math.min(s + 1, steps.length - 2)), 4000);

    try {
      const res = await fetch('/api/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: article?.type ?? 'editorial',
          title: article?.title,
          headings: outline?.headings ?? [],
          productBrief: undefined,
          wordCount,
          uniqueAngle: outline?.uniqueAngle ?? article?.uniqueAngle,
          category: article?.category,
          cluster: article?.cluster,
          competition: article?.competition,
          priority: article?.priority,
          contentType: article?.contentType,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Writing failed');
      setArticleText(data.article);
      setStep(steps.length - 1);
      setDone(true);
      localStorage.setItem(`article-${id}`, data.article);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Writing failed');
    } finally {
      clearInterval(tick);
      setWriting(false);
    }
  };

  const handleTextChange = (val: string) => {
    setArticleText(val);
    localStorage.setItem(`article-${id}`, val);
  };

  const handleSelectionChange = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    if (start !== end) {
      setSelection({ start, end, text: articleText.slice(start, end) });
    } else {
      setSelection(null);
      setLinkMode(null);
      setLinkUrl('');
      setInternalSearch('');
      setInternalResults([]);
    }
  };

  const applyExternalLink = () => {
    if (!selection || !linkUrl.trim()) return;
    const url = linkUrl.startsWith('http') ? linkUrl : `https://${linkUrl}`;
    const newText = articleText.slice(0, selection.start) + `[${selection.text}](${url})` + articleText.slice(selection.end);
    handleTextChange(newText);
    setSelection(null);
    setLinkMode(null);
    setLinkUrl('');
  };

  const applyInternalLink = (category: string, slug: string) => {
    if (!selection) return;
    const newText = articleText.slice(0, selection.start) + `[${selection.text}](/${category}/${slug})` + articleText.slice(selection.end);
    handleTextChange(newText);
    setSelection(null);
    setLinkMode(null);
    setInternalSearch('');
    setInternalResults([]);
  };

  const handleInternalSearch = (q: string) => {
    setInternalSearch(q);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!q.trim()) { setInternalResults([]); return; }
    setSearching(true);
    searchTimeout.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/articles/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setInternalResults(data.articles ?? []);
      } finally {
        setSearching(false);
      }
    }, 300);
  };

  const dismissLinkTool = () => {
    setSelection(null);
    setLinkMode(null);
    setLinkUrl('');
    setInternalSearch('');
    setInternalResults([]);
  };

  return (
    <>
      <StageBar articleId={id} currentStage="write" articleTitle={article?.title} isProduct={isProduct} />
      <div className="wsbody">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.09em', color: 'var(--sage)', marginBottom: 4 }}>
              Stage 2 — {isProduct ? 'Product review writer' : 'Article writer'}
            </div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 400 }}>
              {article?.title ?? 'Article'}
            </div>
            {article && (
              <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>
                {article.category} · {article.contentType} · {article.competition} competition
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Link href={`/article/${id}/${isProduct ? 'brief' : 'outline'}`} className="btn btn-out btn-sm">
              ← {isProduct ? 'Brief' : 'Outline'}
            </Link>
            {!writing && !done && (
              <button className="btn btn-sage" onClick={handleWrite}>✍ Write article</button>
            )}
            {done && (
              <button className="btn btn-out btn-sm" onClick={() => { localStorage.removeItem(`article-${id}`); setDone(false); setArticleText(''); setSelection(null); setLinkMode(null); }}>↺ Rewrite</button>
            )}
            {done && (
              <Link href={`/article/${id}/images`} className="btn btn-sage">Images →</Link>
            )}
          </div>
        </div>

        {outline && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '10px 14px', marginBottom: 16, fontSize: 12, color: 'var(--t2)' }}>
            ✓ Outline loaded — {outline.headings.length} headings
          </div>
        )}

        {(writing || done) && (
          <div className="prog-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, fontWeight: 600 }}>{done ? 'Article complete ✓' : 'Writer agent running…'}</span>
              <span style={{ fontSize: 11, color: 'var(--t3)' }}>{done ? '100%' : `${Math.round((step / steps.length) * 100)}%`}</span>
            </div>
            <div className="prog-bar-bg">
              <div className="prog-bar" style={{ width: done ? '100%' : `${Math.round((step / steps.length) * 100)}%`, transition: 'width .8s ease' }} />
            </div>
            <div className="prog-steps">
              {steps.map((s, i) => (
                <div key={i} className={`ps ${i < step ? 'done' : i === step ? 'act' : 'pend'}`}>
                  <span className="ps-ic">{i < step ? '✓' : i === step ? '⟳' : '○'}</span>{s}
                </div>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 'var(--r)', padding: '12px 16px', color: '#991B1B', fontSize: 13, marginBottom: 16 }}>
            ✕ {error}
          </div>
        )}

        {articleText && (
          <div className="art-preview">

            {/* Link toolbar — appears when text is selected */}
            {selection && (
              <div className="link-toolbar">
                <div className="link-toolbar__selected">
                  <span className="link-toolbar__label">Selected:</span>
                  <span className="link-toolbar__text">{selection.text.length > 60 ? selection.text.slice(0, 60) + '…' : selection.text}</span>
                </div>
                {linkMode === null && (
                  <div className="link-toolbar__actions">
                    <button className="link-btn" onClick={() => setLinkMode('external')}>🔗 External link</button>
                    <button className="link-btn" onClick={() => setLinkMode('internal')}>📄 Internal link</button>
                    <button className="link-btn link-btn--dim" onClick={dismissLinkTool}>✕</button>
                  </div>
                )}
                {linkMode === 'external' && (
                  <div className="link-toolbar__input-row">
                    <input
                      className="link-input"
                      type="url"
                      placeholder="https://example.com"
                      value={linkUrl}
                      onChange={e => setLinkUrl(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') applyExternalLink(); if (e.key === 'Escape') setLinkMode(null); }}
                      autoFocus
                    />
                    <button className="link-btn link-btn--apply" onClick={applyExternalLink} disabled={!linkUrl.trim()}>Apply</button>
                    <button className="link-btn link-btn--dim" onClick={() => setLinkMode(null)}>↩</button>
                  </div>
                )}
                {linkMode === 'internal' && (
                  <div className="link-toolbar__internal">
                    <div className="link-toolbar__input-row">
                      <input
                        className="link-input"
                        type="text"
                        placeholder="Search articles by title…"
                        value={internalSearch}
                        onChange={e => handleInternalSearch(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Escape') setLinkMode(null); }}
                        autoFocus
                      />
                      {searching && <span style={{ fontSize: 11, color: 'var(--t3)', padding: '0 8px' }}>⟳</span>}
                      <button className="link-btn link-btn--dim" onClick={() => setLinkMode(null)}>↩</button>
                    </div>
                    {internalResults.length > 0 && (
                      <div className="link-results">
                        {internalResults.map((r, i) => (
                          <button key={i} className="link-result-item" onClick={() => applyInternalLink(r.category, r.slug)}>
                            <span className="link-result-title">{r.title}</span>
                            <span className="link-result-meta">/{r.category}/{r.slug}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {internalSearch && !searching && internalResults.length === 0 && (
                      <div className="link-no-results">No articles found for &quot;{internalSearch}&quot;</div>
                    )}
                  </div>
                )}
              </div>
            )}

            <textarea
              ref={textareaRef}
              className="art-textarea"
              value={articleText}
              onChange={e => handleTextChange(e.target.value)}
              onMouseUp={handleSelectionChange}
              onKeyUp={handleSelectionChange}
              spellCheck={false}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
              <button className="btn btn-out btn-sm" onClick={() => { localStorage.removeItem(`article-${id}`); setDone(false); setArticleText(''); setSelection(null); setLinkMode(null); }}>↺ Rewrite</button>
              <Link href={`/article/${id}/images`} className="btn btn-sage">Article done — go to images →</Link>
            </div>
          </div>
        )}

        {!writing && !done && !error && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: 32, textAlign: 'center' }}>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, marginBottom: 8 }}>Ready to write</div>
            <div style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 20 }}>
              Set your target word count, then let Claude write the full article.
            </div>
            {!outline && (
              <div style={{ fontSize: 12, color: 'var(--amber)', marginBottom: 16 }}>
                Tip: Generate and approve an outline first for better results.
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 20 }}>
              <label style={{ fontSize: 12, color: 'var(--t2)', fontWeight: 600 }}>Target word count</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 0, border: '1px solid var(--border)', borderRadius: 'var(--r)', overflow: 'hidden' }}>
                {[800, 1200, 1500, 1800, 2500, 3000].map(n => (
                  <button
                    key={n}
                    onClick={() => setWordCount(n)}
                    style={{
                      padding: '6px 12px',
                      fontSize: 12,
                      fontFamily: 'inherit',
                      border: 'none',
                      borderRight: '1px solid var(--border)',
                      background: wordCount === n ? 'var(--sage)' : 'white',
                      color: wordCount === n ? 'white' : 'var(--t2)',
                      cursor: 'pointer',
                      fontWeight: wordCount === n ? 700 : 400,
                    }}
                  >
                    {n.toLocaleString()}
                  </button>
                ))}
                <input
                  type="number"
                  value={wordCount}
                  min={400}
                  max={6000}
                  onChange={e => setWordCount(Number(e.target.value))}
                  style={{ width: 72, padding: '6px 8px', fontSize: 12, border: 'none', fontFamily: 'inherit', color: 'var(--t1)', outline: 'none', textAlign: 'center' }}
                />
              </div>
            </div>
            <button className="btn btn-sage" style={{ margin: '0 auto' }} onClick={handleWrite}>✍ Write article now</button>
          </div>
        )}
      </div>

      <style>{`
        .art-textarea {
          width: 100%;
          min-height: 600px;
          font-family: 'SFMono-Regular', 'Consolas', 'Monaco', monospace;
          font-size: 13px;
          line-height: 1.75;
          color: var(--t1);
          background: transparent;
          border: none;
          resize: vertical;
          outline: none;
          padding: 0;
          box-sizing: border-box;
        }

        /* Link toolbar */
        .link-toolbar {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--r);
          padding: 10px 14px;
          margin-bottom: 14px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .link-toolbar__selected {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
        }
        .link-toolbar__label {
          font-weight: 700;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: .08em;
          color: var(--t3);
          flex-shrink: 0;
        }
        .link-toolbar__text {
          color: var(--t1);
          background: rgba(0,0,0,.05);
          padding: 2px 6px;
          border-radius: 3px;
          font-size: 12px;
          font-style: italic;
        }
        .link-toolbar__actions {
          display: flex;
          gap: 6px;
        }
        .link-toolbar__input-row {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .link-toolbar__internal {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .link-btn {
          padding: 5px 10px;
          font-size: 12px;
          font-family: inherit;
          border: 1px solid var(--border);
          border-radius: var(--r);
          background: var(--surface);
          color: var(--t1);
          cursor: pointer;
          transition: background .12s;
          white-space: nowrap;
        }
        .link-btn:hover { background: var(--sbg); }
        .link-btn--apply {
          background: var(--sage);
          color: white;
          border-color: var(--sage);
        }
        .link-btn--apply:hover { opacity: .85; }
        .link-btn--apply:disabled { opacity: .4; cursor: not-allowed; }
        .link-btn--dim { color: var(--t3); }
        .link-input {
          flex: 1;
          padding: 5px 10px;
          font-size: 12px;
          font-family: inherit;
          border: 1px solid var(--border);
          border-radius: var(--r);
          background: var(--surface);
          color: var(--t1);
          outline: none;
        }
        .link-input:focus { border-color: var(--sage); }
        .link-results {
          background: white;
          border: 1px solid var(--border);
          border-radius: var(--r);
          overflow: hidden;
          max-height: 200px;
          overflow-y: auto;
        }
        .link-result-item {
          display: flex;
          flex-direction: column;
          width: 100%;
          text-align: left;
          padding: 8px 12px;
          border: none;
          border-bottom: 1px solid var(--border);
          background: white;
          cursor: pointer;
          font-family: inherit;
          transition: background .1s;
        }
        .link-result-item:last-child { border-bottom: none; }
        .link-result-item:hover { background: var(--sbg); }
        .link-result-title { font-size: 13px; color: var(--t1); font-weight: 500; }
        .link-result-meta { font-size: 10px; color: var(--t3); margin-top: 2px; }
        .link-no-results {
          font-size: 12px;
          color: var(--t3);
          padding: 8px 0;
          font-style: italic;
        }
      `}</style>
    </>
  );
}
