'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface ShopProduct {
  name: string;
  amazonUrl: string;
  imageUrl: string;
  price: number | '';
  highPrice: number | '';
  stars: number | '';
  reviews: number | '';
  low: number | null;
  high: number | null;
  priceHistory: number[];
  badge: 'low' | 'rising' | 'pick' | '';
  generating: boolean;
}

interface ShopBlock {
  afterHeading: string;
  headingLevel: 'H2' | 'H3';
  products: ShopProduct[];
}

function emptyProduct(): ShopProduct {
  return { name: '', amazonUrl: '', imageUrl: '', price: '', highPrice: '', stars: '', reviews: '', low: null, high: null, priceHistory: [], badge: '', generating: false };
}

function buildStepSvg(history: number[], badge: string): string {
  const W = 180, H = 40, padX = 1, padY = 3;
  const n = history.length;
  if (n < 2) return '';
  const minP = Math.min(...history), maxP = Math.max(...history);
  const range = maxP - minP || 1;
  const toX = (i: number) => padX + (i / (n - 1)) * (W - 2 * padX);
  const toY = (p: number) => H - padY - ((p - minP) / range) * (H - 2 * padY);
  let line = `M ${toX(0).toFixed(1)} ${toY(history[0]).toFixed(1)}`;
  for (let i = 1; i < n; i++) {
    line += ` L ${toX(i).toFixed(1)} ${toY(history[i - 1]).toFixed(1)} L ${toX(i).toFixed(1)} ${toY(history[i]).toFixed(1)}`;
  }
  const fillPath = `${line} L ${toX(n-1).toFixed(1)} ${H} L ${toX(0).toFixed(1)} ${H} Z`;
  const isRising = badge === 'rising';
  const lc = isRising ? '#c17a5a' : '#5a9e8a';
  const fc = isRising ? 'rgba(193,122,90,0.15)' : 'rgba(90,158,138,0.15)';
  const dotX = toX(n - 1).toFixed(1), dotY = toY(history[n - 1]).toFixed(1);
  return `<svg viewBox="0 0 ${W} ${H}" height="${H}" width="100%" preserveAspectRatio="none"><path d="${fillPath}" fill="${fc}"/><path d="${line}" fill="none" stroke="${lc}" stroke-width="1.5" stroke-linecap="square" stroke-linejoin="miter"/><circle cx="${dotX}" cy="${dotY}" r="3" fill="${lc}"/></svg>`;
}

const BADGE_LABELS: Record<string, string> = { low: '✦ All-time low', rising: '↑ Price rising', pick: "✦ Editor's pick" };
const CTA_COPY: Record<string, string> = { low: "Grab It — This Is the Lowest We've Seen →", rising: "It's Going Up — See Today's Price →", pick: "The One We'd Actually Buy →" };
const CTA_BG: Record<string, string> = { low: '#5a9e8a', rising: '#c17a5a', pick: '#333' };

export default function ShopEditClient({ sanityId }: { sanityId: string }) {
  const router = useRouter();
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [title, setTitle] = useState('');
  const [headings, setHeadings] = useState<Array<{ text: string; level: 'H2' | 'H3' }>>([]);
  const [activeHeadings, setActiveHeadings] = useState<Set<string>>(new Set());
  const [blocks, setBlocks] = useState<Record<string, ShopBlock>>({});
  const [dragOver, setDragOver] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/edit-shop?id=${sanityId}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); return; }
        setTitle(data.title ?? '');
        setHeadings(data.headings ?? []);

        // Pre-populate existing shop blocks
        const activeSet = new Set<string>();
        const blockMap: Record<string, ShopBlock> = {};
        for (const b of data.shopBlocks ?? []) {
          activeSet.add(b.afterHeading);
          blockMap[b.afterHeading] = {
            afterHeading: b.afterHeading,
            headingLevel: b.headingLevel ?? 'H2',
            products: (b.products ?? []).map((p: any) => ({ ...p, generating: false })),
          };
        }
        setActiveHeadings(activeSet);
        setBlocks(blockMap);
      })
      .catch(() => setError('Failed to load article'))
      .finally(() => setLoading(false));
  }, [sanityId]);

  const toggleHeading = (text: string, level: 'H2' | 'H3') => {
    setActiveHeadings(prev => {
      const next = new Set(prev);
      if (next.has(text)) {
        next.delete(text);
      } else {
        next.add(text);
        setBlocks(b => {
          if (b[text]) return b;
          return { ...b, [text]: { afterHeading: text, headingLevel: level, products: [emptyProduct()] } };
        });
      }
      return next;
    });
  };

  const updateProduct = (heading: string, pi: number, patch: Partial<ShopProduct>) => {
    setBlocks(prev => {
      const block = { ...prev[heading] };
      block.products = block.products.map((p, i) => i === pi ? { ...p, ...patch } : p);
      return { ...prev, [heading]: block };
    });
  };

  const addProduct = (heading: string) => {
    setBlocks(prev => {
      const block = { ...prev[heading] };
      if (block.products.length >= 3) return prev;
      block.products = [...block.products, emptyProduct()];
      return { ...prev, [heading]: block };
    });
  };

  const removeProduct = (heading: string, pi: number) => {
    setBlocks(prev => {
      const block = { ...prev[heading] };
      block.products = block.products.filter((_, i) => i !== pi);
      return { ...prev, [heading]: block };
    });
  };

  const generateCurve = async (heading: string, pi: number) => {
    const product = blocks[heading]?.products[pi];
    if (!product || !product.price) return;
    updateProduct(heading, pi, { generating: true });
    try {
      const res = await fetch('/api/generate-price-curve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: product.name, price: Number(product.price), highPrice: product.highPrice ? Number(product.highPrice) : undefined }),
      });
      const data = await res.json();
      updateProduct(heading, pi, { priceHistory: data.history ?? [], low: data.low ?? null, high: data.high ?? null, badge: data.badge ?? 'pick', generating: false });
    } catch {
      updateProduct(heading, pi, { generating: false });
    }
  };

  const readChartFromImage = async (heading: string, pi: number, file: File) => {
    const product = blocks[heading]?.products[pi];
    if (!product?.price) return;
    updateProduct(heading, pi, { generating: true });
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
        body: JSON.stringify({ imageBase64: base64, mediaType: file.type || 'image/png', price: Number(product.price), name: product.name }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      updateProduct(heading, pi, { priceHistory: data.history ?? [], low: data.low ?? null, high: data.high ?? null, badge: data.badge ?? 'pick', generating: false });
    } catch {
      updateProduct(heading, pi, { generating: false });
    }
  };

  const handleSave = async () => {
    setSaving(true); setSaved(false); setError('');
    const shopBlocks = Array.from(activeHeadings)
      .filter(h => blocks[h])
      .map(h => ({
        afterHeading: h,
        headingLevel: blocks[h].headingLevel,
        products: blocks[h].products.map(p => {
          const { generating, ...rest } = p;
          return rest;
        }),
      }));

    try {
      const res = await fetch('/api/edit-shop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: sanityId, shopBlocks }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Save failed');
      setSaved(true);
      setTimeout(() => setSaved(false), 4000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="wsbody" style={{ padding: 40, color: 'var(--t3)' }}>Loading article…</div>;

  return (
    <div className="wsbody">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.09em', color: 'var(--sage)', marginBottom: 4 }}>Shop The Look — Edit</div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 400, maxWidth: 600 }}>{title}</div>
          <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 3 }}>Add or edit affiliate product blocks. Changes save directly to Sanity — site rebuilds in ~3 min.</div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <Link href={`/edit/${sanityId}`} className="btn btn-out btn-sm">← Back to edit</Link>
          <button className="btn btn-sage" onClick={handleSave} disabled={saving}>
            {saving ? '⟳ Saving…' : saved ? '✓ Saved to Sanity' : '↑ Save to Sanity'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 'var(--r)', padding: '10px 14px', color: '#991B1B', fontSize: 13, marginBottom: 14 }}>✕ {error}</div>
      )}
      {saved && (
        <div style={{ background: 'var(--sbg)', border: '1px solid #C8D9C0', borderRadius: 'var(--r)', padding: '10px 14px', color: 'var(--sage)', fontSize: 13, marginBottom: 14 }}>
          ✓ Shop blocks saved — Cloudflare rebuilding (~3 min)
        </div>
      )}

      {headings.length === 0 && !loading && (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--t3)', border: '1.5px dashed var(--border)', borderRadius: 'var(--r)' }}>
          No headings found in this article.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {headings.map(({ text, level }) => {
          const isActive = activeHeadings.has(text);
          const block = blocks[text];
          return (
            <div key={text} style={{ border: `1.5px solid ${isActive ? 'var(--sage)' : 'var(--border)'}`, borderRadius: 'var(--r)', overflow: 'hidden', background: isActive ? 'var(--surface)' : 'transparent' }}>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', cursor: 'pointer' }} onClick={() => toggleHeading(text, level)}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', border: `2px solid ${isActive ? 'var(--sage)' : 'var(--border)'}`, background: isActive ? 'var(--sage)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all .15s' }}>
                  {isActive && <span style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>✓</span>}
                </div>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: level === 'H3' ? 'var(--t2)' : 'var(--t1)', paddingLeft: level === 'H3' ? 12 : 0 }}>
                    {level === 'H3' ? '↳ ' : ''}{text}
                  </span>
                </div>
                <div style={{ fontSize: 10, color: 'var(--t3)', flexShrink: 0 }}>
                  {isActive ? `${block?.products?.length ?? 0} product(s)` : 'Click to add shop block'}
                </div>
              </div>

              {isActive && block && (
                <div style={{ borderTop: '1px solid var(--border)', padding: '16px 16px 12px' }}>
                  {block.products.map((product, pi) => (
                    <div key={pi} style={{ marginBottom: 20, paddingBottom: 20, borderBottom: pi < block.products.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--sage)' }}>Product {pi + 1}</span>
                        {block.products.length > 1 && (
                          <button onClick={() => removeProduct(text, pi)} style={{ fontSize: 10, color: 'var(--t3)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>✕ Remove</button>
                        )}
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                        <div style={{ gridColumn: '1 / -1' }}>
                          <label className="lbl">Product Name</label>
                          <input className="inp" value={product.name} onChange={e => updateProduct(text, pi, { name: e.target.value })} placeholder="e.g. Parachute Linen Duvet Cover" />
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                          <label className="lbl">Amazon URL</label>
                          <input className="inp" value={product.amazonUrl} onChange={e => updateProduct(text, pi, { amazonUrl: e.target.value })} placeholder="https://www.amazon.com/dp/..." />
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                          <label className="lbl">Product Image URL <span style={{ color: 'var(--t3)', fontWeight: 400 }}>(right-click on Amazon → Open Image in New Tab → copy URL)</span></label>
                          <input className="inp" value={product.imageUrl} onChange={e => updateProduct(text, pi, { imageUrl: e.target.value })} placeholder="https://m.media-amazon.com/images/I/..." />
                        </div>
                        <div>
                          <label className="lbl">Current Price ($)</label>
                          <input className="inp" type="number" value={product.price} onChange={e => updateProduct(text, pi, { price: e.target.value ? Number(e.target.value) : '' })} placeholder="89" />
                        </div>
                        <div>
                          <label className="lbl">Highest Price Seen ($) <span style={{ color: 'var(--t3)', fontWeight: 400 }}>optional</span></label>
                          <input className="inp" type="number" value={product.highPrice} onChange={e => updateProduct(text, pi, { highPrice: e.target.value ? Number(e.target.value) : '' })} placeholder="129" />
                        </div>
                        <div>
                          <label className="lbl">Stars (e.g. 4.8)</label>
                          <input className="inp" type="number" step="0.1" min="1" max="5" value={product.stars} onChange={e => updateProduct(text, pi, { stars: e.target.value ? Number(e.target.value) : '' })} placeholder="4.8" />
                        </div>
                        <div>
                          <label className="lbl">Review Count</label>
                          <input className="inp" type="number" value={product.reviews} onChange={e => updateProduct(text, pi, { reviews: e.target.value ? Number(e.target.value) : '' })} placeholder="3241" />
                        </div>
                      </div>

                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--t3)', marginBottom: 6 }}>Price curve</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <button
                            className="btn btn-sage btn-sm"
                            onClick={() => generateCurve(text, pi)}
                            disabled={!product.price || product.generating}
                          >
                            {product.generating ? '⟳ Reading…' : '✦ Generate (AI)'}
                          </button>
                          <span style={{ fontSize: 11, color: 'var(--t3)' }}>or</span>
                          <input
                            type="file"
                            accept="image/*"
                            style={{ display: 'none' }}
                            ref={el => { fileInputRefs.current[`${text}-${pi}`] = el; }}
                            onChange={e => { const f = e.target.files?.[0]; if (f) readChartFromImage(text, pi, f); e.target.value = ''; }}
                          />
                          <div
                            onDragOver={e => { e.preventDefault(); if (!product.price || product.generating) return; setDragOver(`${text}-${pi}`); }}
                            onDragLeave={() => setDragOver(null)}
                            onDrop={e => { e.preventDefault(); setDragOver(null); if (!product.price || product.generating) return; const f = e.dataTransfer.files?.[0]; if (f && f.type.startsWith('image/')) readChartFromImage(text, pi, f); }}
                            onClick={() => { if (!product.price || product.generating) return; fileInputRefs.current[`${text}-${pi}`]?.click(); }}
                            style={{
                              border: `1.5px dashed ${dragOver === `${text}-${pi}` ? 'var(--sage)' : 'var(--border)'}`,
                              borderRadius: 'var(--r)',
                              padding: '6px 12px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                              cursor: product.price && !product.generating ? 'pointer' : 'not-allowed',
                              background: dragOver === `${text}-${pi}` ? 'var(--sbg)' : 'transparent',
                              transition: 'border-color .15s, background .15s',
                              fontSize: 11,
                              color: 'var(--t2)',
                              opacity: product.price && !product.generating ? 1 : 0.45,
                              userSelect: 'none',
                            }}
                          >
                            📷 <span>Drop here or <span style={{ color: 'var(--sage)', textDecoration: 'underline' }}>browse</span></span>
                          </div>
                        </div>
                        {product.badge && (
                          <div style={{ display: 'flex', gap: 5, marginTop: 8, flexWrap: 'wrap' }}>
                            {(['low', 'rising', 'pick'] as const).map(b => (
                              <button
                                key={b}
                                onClick={() => updateProduct(text, pi, { badge: b })}
                                style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  padding: '4px 10px',
                                  borderRadius: 20,
                                  border: `1.5px solid ${product.badge === b ? 'var(--sage)' : 'var(--border)'}`,
                                  background: product.badge === b ? 'var(--sage)' : 'transparent',
                                  color: product.badge === b ? 'white' : 'var(--t2)',
                                  cursor: 'pointer',
                                  transition: 'all .15s',
                                }}
                              >
                                {BADGE_LABELS[b]}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Mini preview */}
                      {product.priceHistory.length > 0 && (
                        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 8, padding: 14, maxWidth: 260, marginTop: 8 }}>
                          {product.imageUrl && (
                            <div style={{ height: 120, borderRadius: 6, overflow: 'hidden', marginBottom: 10 }}>
                              <img src={product.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => (e.currentTarget.style.display = 'none')} />
                            </div>
                          )}
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#333', marginBottom: 6, lineHeight: 1.4 }}>{product.name || '—'}</div>
                          <div style={{ fontSize: 18, fontWeight: 900, color: '#333', marginBottom: 4 }}>${product.price}</div>
                          {product.low !== null && product.high !== null && (
                            <div style={{ fontSize: 10, color: '#888', marginBottom: 8 }}>Low ${product.low} · High ${product.high}</div>
                          )}
                          <div dangerouslySetInnerHTML={{ __html: buildStepSvg(product.priceHistory, product.badge) }} style={{ marginBottom: 8 }} />
                          <div style={{ padding: '8px 10px', background: CTA_BG[product.badge] || '#333', borderRadius: 6, color: 'white', fontSize: 11, fontWeight: 700, textAlign: 'center' }}>
                            {CTA_COPY[product.badge] || CTA_COPY.pick}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {block.products.length < 3 && (
                    <button className="btn btn-out btn-sm" onClick={() => addProduct(text)}>+ Add product</button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 28, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <Link href={`/edit/${sanityId}`} className="btn btn-out">← Back to edit</Link>
        <button className="btn btn-sage" onClick={handleSave} disabled={saving}>
          {saving ? '⟳ Saving…' : '↑ Save to Sanity'}
        </button>
      </div>
    </div>
  );
}
