'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import StageBar from '@/components/StageBar';
import { getArticle } from '@/lib/mock-data';

export default function ProductBriefPage() {
  const { id } = useParams<{ id: string }>();
  const article = getArticle(id);

  const [priceNow, setPriceNow] = useState('£89');
  const [priceLow, setPriceLow] = useState('£72');
  const [priceHigh, setPriceHigh] = useState('£119');
  const [stars, setStars] = useState('4.3');
  const [reviews, setReviews] = useState('1,247');
  const [amazonUrl, setAmazonUrl] = useState(article?.amazonUrl ?? '');
  const [angle, setAngle] = useState('Budget-friendly japandi-style bookshelf. Focus on clean bamboo aesthetic, how it fits minimalist room styling, value vs premium options, and practical tips for styling it Japandi. Target buyer: first-time japandi decorator, £50–£100 budget.');

  return (
    <>
      <StageBar articleId={id} currentStage="brief" articleTitle={article?.title} isProduct />
      <div className="wsbody">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, marginBottom: 20 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span className="badge b-product-review">Product Review</span>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.09em', color: 'var(--amber)' }}>
                ● Stage 1 — Enter product data to brief the writer
              </div>
            </div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 400, maxWidth: 560, lineHeight: 1.3 }}>
              {article?.title ?? 'Product Review'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <Link href="/" className="btn btn-out btn-sm">← Queue</Link>
            <Link href={`/article/${id}/write`} className="btn btn-amber">Approve &amp; write →</Link>
          </div>
        </div>

        <div className="prod-brief-layout">
          {/* LEFT */}
          <div>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: 18, marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.09em', color: 'var(--t3)', marginBottom: 14 }}>Article brief</div>

              <div className="field-group">
                <span className="lbl">Amazon URL (affiliate link)</span>
                <input className="field-inp" type="url" value={amazonUrl} onChange={e => setAmazonUrl(e.target.value)} placeholder="https://amazon.co.uk/dp/...?tag=your-tag" />
              </div>

              <div className="field-group">
                <span className="lbl">Article angle / brief</span>
                <textarea className="brief-ta" value={angle} onChange={e => setAngle(e.target.value)} />
              </div>

              <div className="field-group" style={{ marginBottom: 0 }}>
                <span className="lbl">Product images — drop files or paste URLs (agent uses these to describe the product)</span>
                <div className="prod-img-drop" onClick={() => alert('File picker — connect in next session')}>
                  <div style={{ fontSize: 28, marginBottom: 6, opacity: .5 }}>🖼</div>
                  <p style={{ fontSize: 12, color: 'var(--t3)' }}>Drop product photos here · or click to browse</p>
                  <p style={{ fontSize: 10, color: 'var(--t3)', marginTop: 3 }}>JPG/PNG · Can also paste Amazon image URL</p>
                </div>
              </div>
            </div>

            <div className="approve-bar">
              <div style={{ flex: 1, fontSize: 12, color: 'var(--t2)' }}>
                ✓ All product data filled in? Agent writes a full review with sparkline, pros/cons &amp; verdict box.
              </div>
              <Link href={`/article/${id}/write`} className="btn btn-amber">Approve &amp; write →</Link>
            </div>
          </div>

          {/* RIGHT: price + ratings */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="sparkline-box">
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.09em', color: 'var(--amber)', marginBottom: 10 }}>
                Price history — enter manually from Amazon
              </div>
              <div className="spk-stats">
                <div className="price-card current">
                  <span className="lbl">Current price</span>
                  <input className="price-inp" type="text" value={priceNow} onChange={e => setPriceNow(e.target.value)} />
                </div>
                <div className="price-card">
                  <span className="lbl" style={{ color: 'var(--sage)' }}>90-day low ↓</span>
                  <input className="price-inp" type="text" value={priceLow} onChange={e => setPriceLow(e.target.value)} style={{ color: 'var(--sage)' }} />
                </div>
                <div className="price-card">
                  <span className="lbl" style={{ color: 'var(--pin)' }}>90-day high ↑</span>
                  <input className="price-inp" type="text" value={priceHigh} onChange={e => setPriceHigh(e.target.value)} style={{ color: 'var(--pin)' }} />
                </div>
              </div>
              <svg viewBox="0 0 280 55" style={{ width: '100%', height: 55, display: 'block' }}>
                <defs>
                  <linearGradient id="spkG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#B87355" stopOpacity=".25" />
                    <stop offset="100%" stopColor="#B87355" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <polygon points="0,44 35,48 70,36 105,26 140,40 175,46 210,20 245,12 280,18 280,55 0,55" fill="url(#spkG)" />
                <polyline points="0,44 35,48 70,36 105,26 140,40 175,46 210,20 245,12 280,18" fill="none" stroke="#B87355" strokeWidth="2" strokeLinejoin="round" />
                <circle cx="245" cy="12" r="3.5" fill="#5A7450" />
                <circle cx="280" cy="18" r="3.5" fill="#B87355" />
                <text x="2" y="53" fontSize="7" fill="#A89F95" fontFamily="DM Sans,sans-serif">3 months ago</text>
                <text x="238" y="53" fontSize="7" fill="#A89F95" fontFamily="DM Sans,sans-serif">Today</text>
              </svg>
              <div style={{ fontSize: 10, color: 'var(--t2)', marginTop: 8 }}>📊 Sparkline auto-generates in article from these 3 values</div>
            </div>

            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '14px 16px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.09em', color: 'var(--t3)', marginBottom: 12 }}>Amazon ratings</div>
              <div className="field-group">
                <span className="lbl">Star rating (out of 5)</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input className="field-inp" type="text" value={stars} onChange={e => setStars(e.target.value)} style={{ width: 70, fontSize: 18, fontWeight: 700, textAlign: 'center' }} />
                  <div className="stars-row">
                    {[1, 2, 3, 4, 5].map(n => (
                      <span key={n} className={`star ${n <= Math.floor(parseFloat(stars)) ? 'on' : ''}`}>★</span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="field-group" style={{ marginBottom: 0 }}>
                <span className="lbl">Number of reviews</span>
                <input className="field-inp" type="text" value={reviews} onChange={e => setReviews(e.target.value)} />
              </div>
            </div>

            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '12px 14px', fontSize: 11, color: 'var(--t3)' }}>
              <strong style={{ color: 'var(--t1)', display: 'block', marginBottom: 4 }}>Review article structure</strong>
              Intro → Overview → Design &amp; Features → Price analysis (sparkline) → Pros/Cons → Verdict box
              <span style={{ fontSize: 10, marginTop: 4, display: 'block' }}>~1,400 words · Pinterest images same as editorial</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
