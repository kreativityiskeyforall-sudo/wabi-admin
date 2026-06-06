'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import StageBar from '@/components/StageBar';
import { getArticle } from '@/lib/mock-data';

export default function WritePage() {
  const { id } = useParams<{ id: string }>();
  const article = getArticle(id);
  const isProduct = article?.type === 'product-review' || article?.type === 'roundup';

  const [writing, setWriting] = useState(false);
  const [done, setDone] = useState(false);
  const [articleText, setArticleText] = useState('');
  const [error, setError] = useState('');
  const [step, setStep] = useState(0);

  const steps = isProduct
    ? ['Reading product brief', 'Writing introduction', 'Writing design & features', 'Writing pros/cons + sparkline', 'Writing verdict', 'SEO check']
    : ['Reading outline', 'Writing introduction', 'Writing sections 1–4', 'Writing sections 5–8', 'Writing sections 9–end', 'SEO check'];

  const handleWrite = async () => {
    setWriting(true);
    setError('');
    setStep(0);

    const tick = setInterval(() => {
      setStep(s => Math.min(s + 1, steps.length - 2));
    }, 3000);

    try {
      const res = await fetch('/api/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: article?.type ?? 'editorial',
          title: article?.title,
          headings: [],
          productBrief: article?.type === 'product-review' ? {
            currentPrice: '89',
            low90: '72',
            high90: '119',
            stars: '4.3',
            reviewCount: '1247',
            amazonUrl: '',
            angle: 'Best-value japandi bookshelf under £100',
          } : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Writing failed');
      setArticleText(data.article);
      setStep(steps.length - 1);
      setDone(true);
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
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Link href={`/article/${id}/${isProduct ? 'brief' : 'outline'}`} className="btn btn-out btn-sm">
              ← {isProduct ? 'Brief' : 'Outline'}
            </Link>
            {!writing && !done && (
              <button className="btn btn-sage" onClick={handleWrite}>
                ✍ Write article
              </button>
            )}
          </div>
        </div>

        {/* Progress */}
        {(writing || done) && (
          <div className="prog-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, fontWeight: 600 }}>
                {done ? 'Article complete' : 'Writer agent running…'}
              </span>
              <span style={{ fontSize: 11, color: 'var(--t3)' }}>
                {done ? '100%' : `${Math.round((step / steps.length) * 100)}%`}
              </span>
            </div>
            <div className="prog-bar-bg">
              <div className="prog-bar" style={{ width: done ? '100%' : `${Math.round((step / steps.length) * 100)}%`, transition: 'width .8s ease' }} />
            </div>
            <div className="prog-steps">
              {steps.map((s, i) => (
                <div key={i} className={`ps ${i < step ? 'done' : i === step ? 'act' : 'pend'}`}>
                  <span className="ps-ic">{i < step ? '✓' : i === step ? '⟳' : '○'}</span>
                  {s}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 'var(--r)', padding: '12px 16px', color: '#991B1B', fontSize: 13, marginBottom: 16 }}>
            ✕ {error}
          </div>
        )}

        {/* Article output */}
        {articleText && (
          <div className="art-preview">
            <div style={{ whiteSpace: 'pre-wrap', fontSize: 14, lineHeight: 1.7 }}>
              {articleText}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
              <button className="btn btn-out btn-sm" onClick={() => { setDone(false); setArticleText(''); }}>↺ Rewrite</button>
              <Link href={`/article/${id}/images`} className="btn btn-sage">Article done — go to images →</Link>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!writing && !done && !error && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: 32, textAlign: 'center' }}>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, marginBottom: 8 }}>Ready to write</div>
            <div style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 20 }}>
              Claude will write a ~{isProduct ? '1,400' : '1,800'} word {isProduct ? 'product review' : 'article'} based on the outline.
            </div>
            <button className="btn btn-sage" style={{ margin: '0 auto' }} onClick={handleWrite}>
              ✍ Write article now
            </button>
          </div>
        )}
      </div>
    </>
  );
}
