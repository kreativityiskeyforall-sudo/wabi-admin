'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

type InternalArticle = { title: string; category: string; slug: string };
type Selection = { start: number; end: number; text: string };
type ProductItem = {
  name: string; amazonUrl: string; imageUrl: string;
  priceNow: string; price1yrLow: string; price1yrHigh: string;
  stars: string; reviewCount: string; priceHistory: number[];
};

const emptyProduct = (): ProductItem => ({
  name: '', amazonUrl: '', imageUrl: '',
  priceNow: '', price1yrLow: '', price1yrHigh: '',
  stars: '', reviewCount: '', priceHistory: [],
});

export default function EditClient({ sanityId }: { sanityId: string }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [slug, setSlug] = useState('');
  const [markdown, setMarkdown] = useState('');
  const [existingImages, setExistingImages] = useState<any[]>([]);

  // Product items editor
  const [productItems, setProductItems] = useState<ProductItem[]>([]);
  const [showProductEditor, setShowProductEditor] = useState(false);
  const [savingProducts, setSavingProducts] = useState(false);
  const [productsSaved, setProductsSaved] = useState(false);
  const [productsError, setProductsError] = useState('');

  const updateProduct = (i: number, field: keyof ProductItem, value: string) =>
    setProductItems(p => p.map((pr, idx) => idx === i ? { ...pr, [field]: value } : pr));

  const handleSaveProducts = async () => {
    setSavingProducts(true); setProductsError(''); setProductsSaved(false);
    try {
      const res = await fetch('/api/edit-product-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: sanityId, productItems }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed');
      setProductsSaved(true);
      setTimeout(() => setProductsSaved(false), 4000);
    } catch (e: unknown) {
      setProductsError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setSavingProducts(false);
    }
  };

  // Link tool
  const [selection, setSelection] = useState<Selection | null>(null);
  const [linkMode, setLinkMode] = useState<'external' | 'internal' | null>(null);
  const [linkUrl, setLinkUrl] = useState('');
  const [internalSearch, setInternalSearch] = useState('');
  const [internalResults, setInternalResults] = useState<InternalArticle[]>([]);
  const [searching, setSearching] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch(`/api/edit-article?id=${sanityId}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); return; }
        setTitle(data.title);
        setCategory(data.category);
        setSlug(data.slug);
        setMarkdown(data.markdown);
        setExistingImages(data.existingImages ?? []);
        if (data.productItems?.length) {
          setProductItems(data.productItems);
          setShowProductEditor(true);
        }
      })
      .catch(() => setError('Failed to load article'))
      .finally(() => setLoading(false));
  }, [sanityId]);

  const handleSave = async () => {
    setSaving(true); setSaved(false); setError('');
    try {
      const res = await fetch('/api/edit-article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: sanityId, markdown, existingImages }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Save failed');
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleSelectionChange = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    if (start !== end) {
      setSelection({ start, end, text: markdown.slice(start, end) });
    } else {
      setSelection(null); setLinkMode(null); setLinkUrl(''); setInternalSearch(''); setInternalResults([]);
    }
  };

  const applyExternalLink = () => {
    if (!selection || !linkUrl.trim()) return;
    const url = linkUrl.startsWith('http') ? linkUrl : `https://${linkUrl}`;
    const next = markdown.slice(0, selection.start) + `[${selection.text}](${url})` + markdown.slice(selection.end);
    setMarkdown(next);
    setSelection(null); setLinkMode(null); setLinkUrl('');
  };

  const applyInternalLink = (cat: string, sl: string) => {
    if (!selection) return;
    const next = markdown.slice(0, selection.start) + `[${selection.text}](/${cat}/${sl})` + markdown.slice(selection.end);
    setMarkdown(next);
    setSelection(null); setLinkMode(null); setInternalSearch(''); setInternalResults([]);
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
      } finally { setSearching(false); }
    }, 300);
  };

  if (loading) return <div className="wsbody" style={{ padding: 40, color: 'var(--t3)' }}>Loading article…</div>;

  return (
    <div className="wsbody">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.09em', color: 'var(--sage)', marginBottom: 4 }}>
            Edit published article
          </div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 400, maxWidth: 600 }}>{title}</div>
          <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 3 }}>
            {category} · <a href={`https://decoreixy.com/${category}/${slug}`} target="_blank" rel="noopener" style={{ color: 'var(--sage)' }}>↗ view live</a>
            {existingImages.length > 0 && ` · ${existingImages.length} images preserved`}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <Link href={`/edit/${sanityId}/images`} className="btn btn-out btn-sm">+ Images</Link>
          <Link href={`/edit/${sanityId}/shop`} className="btn btn-out btn-sm">✦ Shop The Look</Link>
          <button className="btn btn-out btn-sm" onClick={() => setShowProductEditor(v => !v)}>
            🛒 {productItems.length > 0 ? `Edit ${productItems.length} products` : 'Add products'}
          </button>
          <button className="btn btn-sage" onClick={handleSave} disabled={saving}>
            {saving ? '⟳ Saving…' : saved ? '✓ Saved' : '↑ Save to Sanity'}
          </button>
        </div>
      </div>

      {/* Product items editor — same fields as Brief stage */}
      {showProductEditor && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '14px 18px', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--amber)' }}>
              🛒 Product Cards — {productItems.length} product{productItems.length !== 1 ? 's' : ''}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-out btn-sm" onClick={() => setProductItems(p => [...p, emptyProduct()])}>+ Add product</button>
              <button className="btn btn-amber" onClick={handleSaveProducts} disabled={savingProducts}>
                {savingProducts ? '⟳ Saving…' : productsSaved ? '✓ Saved!' : '↑ Save products to Sanity'}
              </button>
            </div>
          </div>

          {productsError && (
            <div style={{ fontSize: 12, color: '#991B1B', marginBottom: 10 }}>✕ {productsError}</div>
          )}

          {productItems.map((p, i) => (
            <div key={i} style={{ background: '#FAF8F5', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '12px 14px', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--t2)' }}>
                  Product {i + 1}{p.name ? ` — ${p.name}` : ''}
                </span>
                {productItems.length > 1 && (
                  <button className="btn-ghost" style={{ fontSize: 11 }} onClick={() => setProductItems(pr => pr.filter((_, idx) => idx !== i))}>✕ Remove</button>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 8, marginBottom: 8 }}>
                <div>
                  <span className="lbl">Product name</span>
                  <input className="field-inp" type="text" value={p.name} onChange={e => updateProduct(i, 'name', e.target.value)} placeholder="e.g. Bamboo Bedside Table" />
                </div>
                <div>
                  <span className="lbl">Amazon URL</span>
                  <input className="field-inp" type="url" value={p.amazonUrl} onChange={e => updateProduct(i, 'amazonUrl', e.target.value)} placeholder="https://amazon.com/dp/..." style={{ fontSize: 11 }} />
                </div>
              </div>

              <div style={{ marginBottom: 8 }}>
                <span className="lbl">Product image URL (Amazon CDN)</span>
                <input className="field-inp" type="url" value={p.imageUrl} onChange={e => updateProduct(i, 'imageUrl', e.target.value)} placeholder="https://m.media-amazon.com/images/..." style={{ fontSize: 11 }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
                <div>
                  <span className="lbl">Current price</span>
                  <input className="field-inp" type="text" value={p.priceNow} onChange={e => updateProduct(i, 'priceNow', e.target.value)} placeholder="$44.99" style={{ fontWeight: 700 }} />
                </div>
                <div>
                  <span className="lbl">1-yr low</span>
                  <input className="field-inp" type="text" value={p.price1yrLow} onChange={e => updateProduct(i, 'price1yrLow', e.target.value)} placeholder="$36" />
                </div>
                <div>
                  <span className="lbl">1-yr high</span>
                  <input className="field-inp" type="text" value={p.price1yrHigh} onChange={e => updateProduct(i, 'price1yrHigh', e.target.value)} placeholder="$55" />
                </div>
                <div>
                  <span className="lbl">Stars</span>
                  <input className="field-inp" type="text" value={p.stars} onChange={e => updateProduct(i, 'stars', e.target.value)} placeholder="4.5" />
                </div>
                <div>
                  <span className="lbl">Review count</span>
                  <input className="field-inp" type="text" value={p.reviewCount} onChange={e => updateProduct(i, 'reviewCount', e.target.value)} placeholder="1,234" />
                </div>
              </div>

              <div>
                <span className="lbl">Price history — comma-separated weekly prices (oldest → newest)</span>
                <input
                  className="field-inp"
                  type="text"
                  value={Array.isArray(p.priceHistory) ? p.priceHistory.join(', ') : ''}
                  onChange={e => {
                    const vals = e.target.value.split(',').map(v => parseFloat(v.trim())).filter(v => !isNaN(v));
                    setProductItems(pr => pr.map((pr2, idx) => idx === i ? { ...pr2, priceHistory: vals } : pr2));
                  }}
                  placeholder="36, 37, 41, 44, 49, 48, 44, 43, 44.99"
                  style={{ fontSize: 11, fontFamily: 'monospace' }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 'var(--r)', padding: '10px 14px', color: '#991B1B', fontSize: 13, marginBottom: 14 }}>
          ✕ {error}
        </div>
      )}

      {saved && (
        <div style={{ background: 'var(--sbg)', border: '1px solid #C8D9C0', borderRadius: 'var(--r)', padding: '10px 14px', color: 'var(--sage)', fontSize: 13, marginBottom: 14 }}>
          ✓ Saved to Sanity — Cloudflare will rebuild in ~3 minutes
        </div>
      )}

      <div className="art-preview">
        {/* Link toolbar */}
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
                <button className="link-btn link-btn--dim" onClick={() => setSelection(null)}>✕</button>
              </div>
            )}
            {linkMode === 'external' && (
              <div className="link-toolbar__input-row">
                <input className="link-input" type="url" placeholder="https://example.com" value={linkUrl}
                  onChange={e => setLinkUrl(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') applyExternalLink(); if (e.key === 'Escape') setLinkMode(null); }}
                  autoFocus />
                <button className="link-btn link-btn--apply" onClick={applyExternalLink} disabled={!linkUrl.trim()}>Apply</button>
                <button className="link-btn link-btn--dim" onClick={() => setLinkMode(null)}>↩</button>
              </div>
            )}
            {linkMode === 'internal' && (
              <div className="link-toolbar__internal">
                <div className="link-toolbar__input-row">
                  <input className="link-input" type="text" placeholder="Search articles by title…" value={internalSearch}
                    onChange={e => handleInternalSearch(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Escape') setLinkMode(null); }}
                    autoFocus />
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
              </div>
            )}
          </div>
        )}

        <textarea
          ref={textareaRef}
          className="art-textarea"
          value={markdown}
          onChange={e => setMarkdown(e.target.value)}
          onMouseUp={handleSelectionChange}
          onKeyUp={handleSelectionChange}
          spellCheck={false}
        />

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
          <button className="btn btn-sage" onClick={handleSave} disabled={saving}>
            {saving ? '⟳ Saving…' : '↑ Save to Sanity'}
          </button>
        </div>
      </div>

      <style>{`
        .art-textarea {
          width: 100%; min-height: 600px;
          font-family: 'SFMono-Regular', 'Consolas', monospace;
          font-size: 13px; line-height: 1.75; color: var(--t1);
          background: transparent; border: none; resize: vertical; outline: none; padding: 0; box-sizing: border-box;
        }
        .link-toolbar { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r); padding: 10px 14px; margin-bottom: 14px; display: flex; flex-direction: column; gap: 8px; }
        .link-toolbar__selected { display: flex; align-items: center; gap: 8px; font-size: 12px; }
        .link-toolbar__label { font-weight: 700; font-size: 10px; text-transform: uppercase; letter-spacing: .08em; color: var(--t3); flex-shrink: 0; }
        .link-toolbar__text { color: var(--t1); background: rgba(0,0,0,.05); padding: 2px 6px; border-radius: 3px; font-size: 12px; font-style: italic; }
        .link-toolbar__actions { display: flex; gap: 6px; }
        .link-toolbar__input-row { display: flex; align-items: center; gap: 6px; }
        .link-toolbar__internal { display: flex; flex-direction: column; gap: 6px; }
        .link-btn { padding: 5px 10px; font-size: 12px; font-family: inherit; border: 1px solid var(--border); border-radius: var(--r); background: var(--surface); color: var(--t1); cursor: pointer; }
        .link-btn:hover { background: var(--sbg); }
        .link-btn--apply { background: var(--sage); color: white; border-color: var(--sage); }
        .link-btn--apply:disabled { opacity: .4; cursor: not-allowed; }
        .link-btn--dim { color: var(--t3); }
        .link-input { flex: 1; padding: 5px 10px; font-size: 12px; font-family: inherit; border: 1px solid var(--border); border-radius: var(--r); background: var(--surface); color: var(--t1); outline: none; }
        .link-input:focus { border-color: var(--sage); }
        .link-results { background: white; border: 1px solid var(--border); border-radius: var(--r); overflow: hidden; max-height: 200px; overflow-y: auto; }
        .link-result-item { display: flex; flex-direction: column; width: 100%; text-align: left; padding: 8px 12px; border: none; border-bottom: 1px solid var(--border); background: white; cursor: pointer; font-family: inherit; }
        .link-result-item:hover { background: var(--sbg); }
        .link-result-title { font-size: 13px; color: var(--t1); font-weight: 500; }
        .link-result-meta { font-size: 10px; color: var(--t3); margin-top: 2px; }
      `}</style>
    </div>
  );
}
