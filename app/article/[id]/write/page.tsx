'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import StageBar from '@/components/StageBar';
import { getArticle } from '@/lib/mock-data';

const EDITORIAL_STEPS = [
  { label: 'Reading brief from Google Sheet', done: true },
  { label: 'Writing introduction (312 words)', done: true },
  { label: 'Writing sections 1–8', done: true },
  { label: 'Writing sections 9–15…', active: true },
  { label: 'SEO check + save to draft', pending: true },
];

const PRODUCT_STEPS = [
  { label: 'Reading product brief + Amazon data', done: true },
  { label: 'Writing intro + product overview (280 words)', done: true },
  { label: 'Writing design + features section', done: true },
  { label: 'Generating price sparkline + pros/cons', done: true },
  { label: 'Writing verdict + final recommendation…', active: true },
  { label: 'SEO check + save to draft', pending: true },
];

export default function WritePage() {
  const { id } = useParams<{ id: string }>();
  const article = getArticle(id);
  const isProduct = article?.type === 'product-review' || article?.type === 'roundup';
  const steps = isProduct ? PRODUCT_STEPS : EDITORIAL_STEPS;
  const progress = isProduct ? 85 : 72;

  return (
    <>
      <StageBar articleId={id} currentStage="write" articleTitle={article?.title} isProduct={isProduct} />
      <div className="wsbody">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.09em', color: 'var(--sage)', marginBottom: 4 }}>
              ● Stage 2 — {isProduct ? 'Writing product review…' : 'Writing in progress…'}
            </div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 400 }}>
              {article?.title ?? 'Article'}…
            </div>
          </div>
          <Link href={`/article/${id}/${isProduct ? 'brief' : 'outline'}`} className="btn btn-out btn-sm">
            ← {isProduct ? 'Brief' : 'Outline'}
          </Link>
        </div>

        {/* Progress */}
        <div className="prog-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, fontWeight: 600 }}>
              Writer agent{isProduct ? ' — product review mode' : ''}
            </span>
            <span style={{ fontSize: 11, color: 'var(--t3)' }}>{progress}% · ~{isProduct ? '18' : '35'}s remaining</span>
          </div>
          <div className="prog-bar-bg">
            <div className="prog-bar" style={{ width: `${progress}%` }} />
          </div>
          <div className="prog-steps">
            {steps.map((s, i) => (
              <div key={i} className={`ps ${s.done ? 'done' : s.active ? 'act' : 'pend'}`}>
                <span className="ps-ic">{s.done ? '✓' : s.active ? '⟳' : '○'}</span>
                {s.label}
              </div>
            ))}
          </div>
        </div>

        {/* Article preview */}
        <div className="art-preview">
          {isProduct && (
            <div style={{ marginBottom: 12 }}>
              <span className="ap-score">★★★★☆ &nbsp;4.3 / 5 &nbsp;·&nbsp; Our rating</span>
            </div>
          )}

          <div className="ap-h1">
            {isProduct
              ? 'Artiss Bookshelf Bamboo 5 Tier Review: A Japandi Storage Dream for Under £90?'
              : '15 Japandi Living Room DIY Hacks That Cost Almost Nothing'}
          </div>

          <div className="ap-intro">
            {isProduct
              ? 'If you have been searching for a bookshelf that naturally belongs in a japandi interior without costing a small fortune, the Artiss Bamboo 5 Tier has become something of a quiet favourite. We tested it over four weeks in a typical japandi-styled living room. Here is what we found.'
              : 'The calming beauty of Japandi style has a well-kept secret: most of it costs almost nothing to achieve. Here are 15 practical hacks that will transform your living room into a considered, intentional space.'}
          </div>

          {isProduct && (
            <>
              {/* Sparkline */}
              <div className="sparkline-box" style={{ margin: '18px 0 14px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.09em', color: 'var(--amber)', marginBottom: 10 }}>Price history · last 90 days</div>
                <div className="spk-stats">
                  <div className="spk-stat"><div className="spk-val">£89</div><div className="spk-sub">Today</div></div>
                  <div className="spk-stat"><div className="spk-val low">£72</div><div className="spk-sub">90-day low ↓</div></div>
                  <div className="spk-stat"><div className="spk-val high">£119</div><div className="spk-sub">90-day high ↑</div></div>
                </div>
                <svg viewBox="0 0 280 55" style={{ width: '100%', height: 55, display: 'block' }}>
                  <defs><linearGradient id="spkG2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#B87355" stopOpacity=".25" /><stop offset="100%" stopColor="#B87355" stopOpacity="0" /></linearGradient></defs>
                  <polygon points="0,44 35,48 70,36 105,26 140,40 175,46 210,20 245,12 280,18 280,55 0,55" fill="url(#spkG2)" />
                  <polyline points="0,44 35,48 70,36 105,26 140,40 175,46 210,20 245,12 280,18" fill="none" stroke="#B87355" strokeWidth="2" strokeLinejoin="round" />
                  <circle cx="245" cy="12" r="3.5" fill="#5A7450" /><circle cx="280" cy="18" r="3.5" fill="#B87355" />
                </svg>
                <div style={{ fontSize: 11, color: 'var(--t2)', marginTop: 8 }}>📉 Currently £17 above its 90-day low — worth waiting for a sale if budget is tight.</div>
              </div>

              {/* Pros/Cons */}
              <div className="pros-cons">
                <div className="pc-box pros"><div className="pc-head">What we liked</div><div className="pc-item">✓ Clean, consistent bamboo finish</div><div className="pc-item">✓ Easy 15-minute assembly</div><div className="pc-item">✓ Very stable once built</div><div className="pc-item">✓ Excellent value under £90</div></div>
                <div className="pc-box cons"><div className="pc-head">What to know</div><div className="pc-item">✕ Bamboo shows water marks</div><div className="pc-item">✕ No anti-tip wall anchor</div><div className="pc-item">✕ Slight shelf size variation</div></div>
              </div>

              {/* Verdict */}
              <div className="verdict-box">
                <div className="verdict-top">
                  <div className="verdict-stars-row">{[1,2,3,4].map(n => <span key={n} className="verdict-star">★</span>)}<span className="verdict-star" style={{ opacity: .3 }}>★</span></div>
                  <span className="verdict-rating-num">4.3</span>
                  <span className="verdict-review-ct">/ 5 · 1,247 reviews</span>
                  <span className="verdict-badge">Wabi-Decore Pick</span>
                </div>
                <div className="verdict-grid">
                  <div className="verdict-col pros"><div className="vc-head">Good for</div><ul><li>First japandi room makeover</li><li>£50–£100 budget</li><li>Bedroom or living room</li></ul></div>
                  <div className="verdict-col cons"><div className="vc-head">Not ideal for</div><ul><li>Heavy book collections</li><li>High-humidity rooms</li><li>Premium setups</li></ul></div>
                </div>
                <div className="verdict-says">"One of the best-value japandi storage pieces available right now. At its low of £72 it is genuinely exceptional."</div>
              </div>
            </>
          )}

          {!isProduct && (
            <>
              <div className="ap-h2">1. Replace metal handles with wooden ones</div>
              <div className="ap-p">Nothing dates a piece of furniture faster than shiny chrome hardware. Swap handles on sideboards for solid oak pulls — a set of eight costs under £15 and takes twenty minutes.</div>
              <div className="ap-h2">2. Add a low, slatted wooden coffee table</div>
              <div className="ap-p">Japandi furniture sits close to the ground. A simple slatted coffee table can be built for under £40 in pine, sanded and oiled with Danish oil…</div>
            </>
          )}

          <div className="ap-more">⟳ Writing {isProduct ? 'verdict section' : 'sections 9–15'} · preview updates live</div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
            <Link href={`/article/${id}/${isProduct ? 'brief' : 'outline'}`} className="btn btn-out btn-sm">← Revise {isProduct ? 'brief' : 'outline'}</Link>
            <Link href={`/article/${id}/images`} className="btn btn-sage">Article done — go to images →</Link>
          </div>
        </div>
      </div>
    </>
  );
}
