'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import StageBar from '@/components/StageBar';
import type { SheetArticle } from '@/lib/sheets';

type Heading = { level: string; text: string; note: string };

export default function WriteClient({ id, article }: { id: string; article: SheetArticle | null }) {
  const isProduct = article?.type === 'product-review' || article?.type === 'roundup';

  const [writing, setWriting] = useState(false);
  const [done, setDone] = useState(false);
  const [articleText, setArticleText] = useState('');
  const [error, setError] = useState('');
  const [step, setStep] = useState(0);
  const [outline, setOutline] = useState<{ headings: Heading[] } | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem(`outline-${id}`);
    if (stored) setOutline(JSON.parse(stored));
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
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Writing failed');
      setArticleText(data.article);
      setStep(steps.length - 1);
      setDone(true);
      // Store written article for publish stage
      sessionStorage.setItem(`article-${id}`, data.article);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Writing failed');
    } finally {
      clearInterval(tick);
      setWriting(false);
    }
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
            <div style={{ whiteSpace: 'pre-wrap', fontSize: 14, lineHeight: 1.7 }}>{articleText}</div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
              <button className="btn btn-out btn-sm" onClick={() => { setDone(false); setArticleText(''); }}>↺ Rewrite</button>
              <Link href={`/article/${id}/images`} className="btn btn-sage">Article done — go to images →</Link>
            </div>
          </div>
        )}

        {!writing && !done && !error && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: 32, textAlign: 'center' }}>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, marginBottom: 8 }}>Ready to write</div>
            <div style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 8 }}>
              Claude will write a ~{isProduct ? '1,400' : '1,800'} word {isProduct ? 'product review' : 'article'}.
            </div>
            {!outline && (
              <div style={{ fontSize: 12, color: 'var(--amber)', marginBottom: 16 }}>
                Tip: Generate and approve an outline first for better results.
              </div>
            )}
            <button className="btn btn-sage" style={{ margin: '0 auto' }} onClick={handleWrite}>✍ Write article now</button>
          </div>
        )}
      </div>
    </>
  );
}
