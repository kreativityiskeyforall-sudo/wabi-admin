'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import StageBar from '@/components/StageBar';
import type { SheetArticle } from '@/lib/sheets';

type ProductEntry = {
  name: string;
  amazonUrl: string;
  brief: string;
  review: string;
  imageUrls: string;
  priceNow: string;
  price90Low: string;
  price90High: string;
  stars: string;
  reviewCount: string;
  priceHistory?: number[];
};

const emptyProduct = (n: number): ProductEntry => ({
  name: '',
  amazonUrl: '',
  brief: '',
  review: '',
  imageUrls: '',
  priceNow: '',
  price90Low: '',
  price90High: '',
  stars: '',
  reviewCount: '',
});

function MiniSparkline({ low, current, high, history, idx }: { low: string; current: string; high: string; history?: number[]; idx: number }) {
  const parse = (s: string) => parseFloat(s.replace(/[^0-9.]/g, '')) || 0;
  const gid = `spkGrad-${idx}`;

  if (history && history.length >= 2) {
    const mn = Math.min(...history) * 0.97;
    const mx = Math.max(...history) * 1.03;
    const range = mx - mn || 1;
    const W = 280, H = 55;
    const yv = (v: number) => ((H - 10) - ((v - mn) / range) * (H - 18)).toFixed(1);
    let d = '';
    history.forEach((v, i) => {
      const x = ((i / (history.length - 1)) * W).toFixed(1);
      if (i === 0) { d += `M${x},${yv(v)}`; }
      else { d += ` H${x} V${yv(v)}`; }
    });
    const lastY = yv(history[history.length - 1]);
    const fillPts = history.map((v, i) => `${((i / (history.length - 1)) * W).toFixed(1)},${yv(v)}`).join(' ');
    return (
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 44, display: 'block', marginTop: 4 }}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#B87355" stopOpacity=".18" />
            <stop offset="100%" stopColor="#B87355" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={`0,${yv(history[0])} ${fillPts} ${W},${H} 0,${H}`} fill={`url(#${gid})`} />
        <path d={d} fill="none" stroke="#B87355" strokeWidth="2" strokeLinejoin="round" />
        <circle cx={W} cy={lastY} r="3" fill="#B87355" />
        <text x="2" y={H - 1} fontSize="7" fill="#A89F95" fontFamily="DM Sans,sans-serif">1-year low</text>
        <text x="220" y={H - 1} fontSize="7" fill="#A89F95" fontFamily="DM Sans,sans-serif">Today</text>
      </svg>
    );
  }

  const lo = parse(low); const cu = parse(current); const hi = parse(high);
  if (!lo && !cu && !hi) return null;
  const mn = Math.min(lo, cu, hi) * 0.97;
  const mx = Math.max(lo, cu, hi) * 1.03;
  const range = mx - mn || 1;
  const y = (v: number) => (55 - ((v - mn) / range) * 45).toFixed(1);
  const pts = `0,${y(lo)} 140,${y(hi)} 280,${y(cu)}`;
  return (
    <svg viewBox="0 0 280 55" style={{ width: '100%', height: 44, display: 'block', marginTop: 4 }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#B87355" stopOpacity=".22" />
          <stop offset="100%" stopColor="#B87355" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${y(lo)} 140,${y(hi)} 280,${y(cu)} 280,55 0,55`} fill={`url(#${gid})`} />
      <polyline points={pts} fill="none" stroke="#B87355" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="280" cy={y(cu)} r="3" fill="#B87355" />
      <text x="2" y="53" fontSize="7" fill="#A89F95" fontFamily="DM Sans,sans-serif">1-year low</text>
      <text x="220" y="53" fontSize="7" fill="#A89F95" fontFamily="DM Sans,sans-serif">Today</text>
    </svg>
  );
}

export default function BriefClient({ id, article }: { id: string; article: SheetArticle | null }) {
  const [products, setProducts] = useState<ProductEntry[]>([emptyProduct(1)]);
  const [angle, setAngle] = useState(article?.uniqueAngle ?? '');
  const [chartLoading, setChartLoading] = useState<boolean[]>([]);
  const [chartDragOver, setChartDragOver] = useState<number | null>(null);
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const chartFileRefs = useRef<(HTMLInputElement | null)[]>([]);

  const readChartFromImage = async (i: number, file: File, currentPrice: string, productName: string) => {
    if (!currentPrice) return;
    setChartLoading(prev => { const next = [...prev]; next[i] = true; return next; });
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve((e.target?.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const res = await fetch('/api/read-price-chart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, mediaType: file.type || 'image/png', price: Number(currentPrice.replace(/[^0-9.]/g, '')), name: productName }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setProducts(p => p.map((pr, idx) => idx === i ? {
        ...pr,
        price90Low: String(data.low ?? pr.price90Low),
        price90High: String(data.high ?? pr.price90High),
        priceHistory: data.history ?? pr.priceHistory,
      } : pr));
    } catch { /* ignore */ } finally {
      setChartLoading(prev => { const next = [...prev]; next[i] = false; return next; });
    }
  };

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(`brief-${id}`);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.products?.length) setProducts(parsed.products);
        if (parsed.angle) setAngle(parsed.angle);
      } catch { /* ignore */ }
    }
  }, [id]);

  // Save to localStorage whenever products or angle change
  useEffect(() => {
    localStorage.setItem(`brief-${id}`, JSON.stringify({ products, angle }));
  }, [id, products, angle]);

  const addProduct = () => setProducts(p => [...p, emptyProduct(p.length + 1)]);
  const removeProduct = (i: number) => setProducts(p => p.filter((_, idx) => idx !== i));

  const update = (i: number, field: keyof ProductEntry, value: string) =>
    setProducts(p => p.map((pr, idx) => idx === i ? { ...pr, [field]: value } : pr));

  const handleImageDrop = (i: number, e: React.DragEvent) => {
    e.preventDefault();
    const urls: string[] = [];
    for (const item of Array.from(e.dataTransfer.items)) {
      if (item.kind === 'string' && item.type === 'text/uri-list') {
        item.getAsString(s => {
          const existing = products[i].imageUrls;
          update(i, 'imageUrls', (existing ? existing + '\n' : '') + s.trim());
        });
      } else if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file && file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = ev => {
            const dataUrl = (ev.target?.result as string) ?? '';
            const existing = products[i].imageUrls;
            update(i, 'imageUrls', (existing ? existing + '\n' : '') + dataUrl);
          };
          reader.readAsDataURL(file);
        }
      }
    }
  };

  const wordCount = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

  return (
    <>
      <StageBar articleId={id} currentStage="brief" articleTitle={article?.title} isProduct />
      <div className="wsbody">

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, marginBottom: 20 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span className="badge b-product-review">Product Review</span>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.09em', color: 'var(--amber)' }}>
                ● Stage 1 — Add products to brief the writer
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

        {/* Overall angle */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '14px 18px', marginBottom: 16 }}>
          <span className="lbl">Overall article brief / angle</span>
          <textarea
            className="brief-ta"
            style={{ minHeight: 52 }}
            value={angle}
            onChange={e => setAngle(e.target.value)}
            placeholder="e.g. Focus on furniture $200+. Clean minimalist aesthetic, Japandi fit, value vs premium."
          />
        </div>

        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.09em', color: 'var(--t3)', marginBottom: 10 }}>
          Products — {products.length} added
        </div>

        {products.map((prod, i) => (
          <div key={i} className="prod-card" style={{ marginBottom: 14 }}>
            {/* Card header */}
            <div className="prod-card-hd">
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--t2)' }}>
                Product {i + 1}{prod.name ? ` — ${prod.name}` : ''}
              </span>
              {products.length > 1 && (
                <button className="btn-ghost" style={{ fontSize: 11 }} onClick={() => removeProduct(i)}>✕ Remove</button>
              )}
            </div>

            <div className="prod-card-body">
              {/* Row 1: name + Amazon URL */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 10 }}>
                <div className="field-group" style={{ marginBottom: 0 }}>
                  <span className="lbl">Product name</span>
                  <input className="field-inp" type="text" value={prod.name}
                    onChange={e => update(i, 'name', e.target.value)}
                    placeholder="e.g. Artiss Japandi Shelf Unit" />
                </div>
                <div className="field-group" style={{ marginBottom: 0 }}>
                  <span className="lbl">Amazon URL (affiliate link)</span>
                  <input className="field-inp" type="url" value={prod.amazonUrl}
                    onChange={e => update(i, 'amazonUrl', e.target.value)}
                    placeholder="https://amazon.co.uk/dp/...?tag=your-tag"
                    style={{ fontSize: 11 }} />
                </div>
              </div>

              {/* Row 2: agent brief */}
              <div className="field-group" style={{ marginBottom: 0 }}>
                <span className="lbl">Agent brief — what to focus on for this product</span>
                <textarea className="brief-ta" style={{ minHeight: 52 }} value={prod.brief}
                  onChange={e => update(i, 'brief', e.target.value)}
                  placeholder="e.g. Emphasise Japandi aesthetic, bamboo finish, easy assembly. Compare to premium rivals." />
              </div>

              {/* Row 3: review + image drop */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px', gap: 10 }}>
                <div className="field-group" style={{ marginBottom: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                    <span className="lbl">Review — 50–70 words (agent writes or paste your own)</span>
                    <span style={{ fontSize: 9, color: wordCount(prod.review) > 70 ? 'var(--pin)' : wordCount(prod.review) >= 50 ? 'var(--sage)' : 'var(--t3)' }}>
                      {wordCount(prod.review)} words
                    </span>
                  </div>
                  <textarea className="brief-ta" style={{ minHeight: 90 }} value={prod.review}
                    onChange={e => update(i, 'review', e.target.value)}
                    placeholder="Leave blank — agent writes a 50–70 word review using your brief above. Or write your own here." />
                </div>

                {/* Image drop zone */}
                <div className="field-group" style={{ marginBottom: 0 }}>
                  <span className="lbl">Product images</span>
                  <div
                    className="prod-img-drop"
                    style={{ minHeight: 88, padding: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => handleImageDrop(i, e)}
                    onClick={() => fileInputRefs.current[i]?.click()}
                  >
                    <div style={{ fontSize: 20, marginBottom: 3, opacity: .5 }}>🖼</div>
                    <p style={{ fontSize: 10, color: 'var(--t3)', textAlign: 'center', margin: 0 }}>Drop photos or click to browse</p>
                    <p style={{ fontSize: 9, color: 'var(--t3)', margin: '2px 0 0' }}>or paste Amazon image URL below</p>
                    <input
                      ref={el => { fileInputRefs.current[i] = el; }}
                      type="file"
                      accept="image/*"
                      multiple
                      style={{ display: 'none' }}
                      onChange={e => {
                        const files = Array.from(e.target.files ?? []);
                        files.forEach(file => {
                          const reader = new FileReader();
                          reader.onload = ev => {
                            const dataUrl = (ev.target?.result as string) ?? '';
                            setProducts(p => p.map((pr, idx) =>
                              idx === i ? { ...pr, imageUrls: (pr.imageUrls ? pr.imageUrls + '\n' : '') + dataUrl } : pr
                            ));
                          };
                          reader.readAsDataURL(file);
                        });
                      }}
                    />
                  </div>
                  <textarea
                    className="field-inp"
                    style={{ fontSize: 10, minHeight: 38, marginTop: 4, resize: 'none' }}
                    value={prod.imageUrls}
                    onChange={e => update(i, 'imageUrls', e.target.value)}
                    placeholder="Paste Amazon image URL(s), one per line"
                  />
                </div>
              </div>

              {/* Row 4: price + ratings + sparkline */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: 8 }}>
                <div>
                  <span className="lbl">Current price</span>
                  <input className="field-inp" type="text" value={prod.priceNow}
                    onChange={e => update(i, 'priceNow', e.target.value)}
                    placeholder="£89" style={{ fontWeight: 700 }} />
                </div>
                <div>
                  <span className="lbl" style={{ color: 'var(--sage)' }}>1-year low ↓</span>
                  <input className="field-inp" type="text" value={prod.price90Low}
                    onChange={e => update(i, 'price90Low', e.target.value)}
                    placeholder="£72" style={{ color: 'var(--sage)', fontWeight: 700 }} />
                </div>
                <div>
                  <span className="lbl" style={{ color: 'var(--pin)' }}>1-year high ↑</span>
                  <input className="field-inp" type="text" value={prod.price90High}
                    onChange={e => update(i, 'price90High', e.target.value)}
                    placeholder="£119" style={{ color: 'var(--pin)', fontWeight: 700 }} />
                </div>
                <div>
                  <span className="lbl">Stars (out of 5)</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input className="field-inp" type="text" value={prod.stars}
                      onChange={e => update(i, 'stars', e.target.value)}
                      placeholder="4.3" style={{ fontWeight: 700, width: 54 }} />
                    <span style={{ fontSize: 11 }}>
                      {[1,2,3,4,5].map(n => (
                        <span key={n} style={{ color: n <= Math.floor(parseFloat(prod.stars)||0) ? '#F59E0B' : '#E5E7EB' }}>★</span>
                      ))}
                    </span>
                  </div>
                </div>
                <div>
                  <span className="lbl">No. of reviews</span>
                  <input className="field-inp" type="text" value={prod.reviewCount}
                    onChange={e => update(i, 'reviewCount', e.target.value)}
                    placeholder="1,247" />
                </div>
              </div>

              {/* Chart upload + sparkline — always visible */}
              <div style={{ background: 'var(--abg)', border: '1px solid #E8D8C8', borderRadius: 6, padding: '8px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, flexWrap: 'wrap', gap: 6 }}>
                  <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--t3)' }}>
                    📊 {prod.priceHistory?.length ? '1-year chart (from Amazon screenshot)' : 'Sparkline preview — auto-generates in article'}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {chartLoading[i] && <span style={{ fontSize: 10, color: 'var(--t3)' }}>⟳ Reading chart…</span>}
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      ref={el => { chartFileRefs.current[i] = el; }}
                      onChange={e => { const f = e.target.files?.[0]; if (f) readChartFromImage(i, f, prod.priceNow, prod.name); e.target.value = ''; }}
                    />
                    <div
                      onDragOver={e => { e.preventDefault(); setChartDragOver(i); }}
                      onDragLeave={() => setChartDragOver(null)}
                      onDrop={e => { e.preventDefault(); setChartDragOver(null); const f = e.dataTransfer.files?.[0]; if (f && f.type.startsWith('image/')) readChartFromImage(i, f, prod.priceNow, prod.name); }}
                      onClick={() => { chartFileRefs.current[i]?.click(); }}
                      style={{
                        border: `1.5px dashed ${chartDragOver === i ? 'var(--sage)' : 'var(--border)'}`,
                        borderRadius: 'var(--r)',
                        padding: '4px 10px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        cursor: chartLoading[i] ? 'wait' : 'pointer',
                        background: chartDragOver === i ? 'var(--sbg)' : 'transparent',
                        transition: 'border-color .15s, background .15s',
                        fontSize: 10,
                        color: 'var(--t2)',
                        opacity: chartLoading[i] ? 0.5 : 1,
                        userSelect: 'none',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      📷 <span>Drop Amazon chart or <span style={{ color: 'var(--sage)', textDecoration: 'underline' }}>browse</span></span>
                    </div>
                  </div>
                </div>
                <MiniSparkline low={prod.price90Low ?? ''} current={prod.priceNow ?? ''} high={prod.price90High ?? ''} history={prod.priceHistory} idx={i} />
              </div>
            </div>
          </div>
        ))}

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
          <button className="btn btn-out" onClick={addProduct}>+ Add product</button>
          <span style={{ fontSize: 11, color: 'var(--t3)' }}>
            Agent writes a 50–70 word review per product using your brief. Leave the review field blank to let the agent write it.
          </span>
        </div>

        <div className="approve-bar">
          <div style={{ flex: 1, fontSize: 12, color: 'var(--t2)' }}>
            ✓ All products added? Agent writes the full article with a review, sparkline &amp; price analysis per product.
          </div>
          <Link href={`/article/${id}/write`} className="btn btn-amber">Approve &amp; write →</Link>
        </div>
      </div>
    </>
  );
}
