'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import StageBar from '@/components/StageBar';
import { getArticle } from '@/lib/mock-data';
import type { RoundupProduct } from '@/lib/types';

const DEFAULT_PRODUCTS: RoundupProduct[] = [
  { name: 'Artiss Bookshelf Bamboo 5 Tier', amazonUrl: 'https://amazon.co.uk/dp/B08YQ2RLGX?tag=wabidecore-21', notes: 'Best value pick — clean bamboo finish, easy assembly', priceNow: '£89', price90Low: '£72', price90High: '£119', stars: 4.3, reviewCount: 1247, isBestPick: true },
  { name: 'IKEA KALLAX 4-Unit Shelf', amazonUrl: 'https://amazon.co.uk/dp/B07G4ZK4ZQ', notes: 'Modular, customisable, pairs well with japandi inserts', priceNow: '£119', price90Low: '£99', price90High: '£139', stars: 4.5, reviewCount: 8432 },
  { name: 'Songmics Ladder Shelf Bamboo', amazonUrl: 'https://amazon.co.uk/dp/B08N5ZCWZ1', notes: 'Space-saving ladder design, very japandi, budget pick', priceNow: '£65', price90Low: '£58', price90High: '£79', stars: 4.1, reviewCount: 2891 },
];

export default function RoundupBriefPage() {
  const { id } = useParams<{ id: string }>();
  const article = getArticle(id);
  const [products, setProducts] = useState<RoundupProduct[]>(DEFAULT_PRODUCTS);
  const [angle, setAngle] = useState('Best bookshelves with a japandi / minimalist aesthetic. Mix of budget and mid-range options. Focus on clean lines, natural materials, storage capacity. Best-pick badge for highest overall score.');

  const addProduct = () => {
    setProducts(p => [...p, { name: `Product ${p.length + 1}`, amazonUrl: '', notes: '', priceNow: '', price90Low: '', price90High: '', stars: 0, reviewCount: 0 }]);
  };

  const removeProduct = (i: number) => setProducts(p => p.filter((_, idx) => idx !== i));

  const updateProduct = (i: number, field: keyof RoundupProduct, value: string | number | boolean) => {
    setProducts(p => p.map((pr, idx) => idx === i ? { ...pr, [field]: value } : pr));
  };

  return (
    <>
      <StageBar articleId={id} currentStage="roundup" articleTitle={article?.title} isProduct />
      <div className="wsbody">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, marginBottom: 20 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span className="badge b-roundup">Roundup</span>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.09em', color: 'var(--amber)' }}>
                ● Stage 1 — Add products to brief the writer
              </div>
            </div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 400, maxWidth: 560, lineHeight: 1.3 }}>
              {article?.title ?? 'Product Roundup'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <Link href="/" className="btn btn-out btn-sm">← Queue</Link>
            <Link href={`/article/${id}/write`} className="btn btn-amber">Approve &amp; write →</Link>
          </div>
        </div>

        {/* Brief */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '16px 18px', marginBottom: 16 }}>
          <span className="lbl">Overall article brief / angle</span>
          <textarea className="brief-ta" style={{ minHeight: 60 }} value={angle} onChange={e => setAngle(e.target.value)} />
        </div>

        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.09em', color: 'var(--t3)', marginBottom: 10 }}>
          Products — {products.length} added · click + to add more
        </div>

        {products.map((prod, i) => (
          <div key={i} className="prod-card">
            <div className="prod-card-hd">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {prod.isBestPick && <span className="badge b-product-review" style={{ fontSize: 9 }}>★ Best Pick</span>}
                <span style={{ fontSize: 12, fontWeight: 600 }}>
                  {prod.name || `Product ${i + 1}`}
                </span>
              </div>
              <button className="btn-ghost" onClick={() => removeProduct(i)}>✕ Remove</button>
            </div>
            <div className="prod-card-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div className="field-group" style={{ marginBottom: 0 }}>
                  <span className="lbl">Product name</span>
                  <input className="field-inp" type="text" value={prod.name} onChange={e => updateProduct(i, 'name', e.target.value)} />
                </div>
                <div className="field-group" style={{ marginBottom: 0 }}>
                  <span className="lbl">Amazon URL</span>
                  <input className="field-inp" type="url" value={prod.amazonUrl} onChange={e => updateProduct(i, 'amazonUrl', e.target.value)} style={{ fontSize: 11 }} />
                </div>
                <div className="field-group" style={{ marginBottom: 0, gridColumn: '1 / -1' }}>
                  <span className="lbl">Brief / notes for agent</span>
                  <input className="field-inp" type="text" value={prod.notes} onChange={e => updateProduct(i, 'notes', e.target.value)} style={{ fontSize: 11 }} />
                </div>
              </div>
              <div className="prod-mini-fields">
                <div><span className="lbl">Current</span><input className="field-inp" type="text" value={prod.priceNow} onChange={e => updateProduct(i, 'priceNow', e.target.value)} style={{ fontWeight: 700 }} /></div>
                <div><span className="lbl" style={{ color: 'var(--sage)' }}>90-day low</span><input className="field-inp" type="text" value={prod.price90Low} onChange={e => updateProduct(i, 'price90Low', e.target.value)} style={{ color: 'var(--sage)', fontWeight: 700 }} /></div>
                <div><span className="lbl" style={{ color: 'var(--pin)' }}>90-day high</span><input className="field-inp" type="text" value={prod.price90High} onChange={e => updateProduct(i, 'price90High', e.target.value)} style={{ color: 'var(--pin)', fontWeight: 700 }} /></div>
                <div><span className="lbl">Stars</span><input className="field-inp" type="text" value={prod.stars} onChange={e => updateProduct(i, 'stars', e.target.value)} style={{ fontWeight: 700 }} /></div>
                <div><span className="lbl">Reviews</span><input className="field-inp" type="text" value={prod.reviewCount} onChange={e => updateProduct(i, 'reviewCount', e.target.value)} /></div>
                <div><span className="lbl">Image URL</span><input className="field-inp" type="text" placeholder="optional" /></div>
              </div>
            </div>
          </div>
        ))}

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
          <button className="btn btn-out" onClick={addProduct}>+ Add product</button>
          <span style={{ fontSize: 11, color: 'var(--t3)' }}>Agent picks the best order &amp; assigns best-pick badge automatically</span>
        </div>

        <div className="approve-bar">
          <div style={{ flex: 1, fontSize: 12, color: 'var(--t2)' }}>
            ✓ All products added? Agent writes the roundup with per-product sparklines, comparison &amp; best-pick verdict.
          </div>
          <Link href={`/article/${id}/write`} className="btn btn-amber">Approve &amp; write roundup →</Link>
        </div>
      </div>
    </>
  );
}
