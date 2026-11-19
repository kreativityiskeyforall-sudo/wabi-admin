'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface ImageBlock {
  _key: string;
  assetUrl: string;
  assetRef: string;
  alt?: string;
}

interface ShopProduct {
  name: string; amazonUrl: string; imageUrl: string; price: number;
  highPrice?: number; stars: number; reviews: number;
  low?: number; high?: number; priceHistory?: number[]; badge?: string;
}

interface ShopBlock {
  afterHeading: string; headingLevel: string; products: ShopProduct[];
}

interface Draft {
  _id: string; title: string; slug: string; category: string; type: string;
  cluster: string | null; kicker: string; intro: string; pullQuote: string;
  _createdAt: string; _updatedAt: string;
  featuredImageUrl?: string; featuredImageRef?: string;
  body: unknown[]; shopBlocks: ShopBlock[]; productItems: unknown[];
}

function extractBodyMarkdown(body: unknown[]): string {
  // Extract plain text summary from portable text for display
  if (!Array.isArray(body)) return '';
  return body.map((block: unknown) => {
    const b = block as Record<string, unknown>;
    if (b._type === 'image') return `[Image: ${b.alt ?? ''}]`;
    const style = (b.style as string) ?? 'normal';
    const text = ((b.children as Array<{ text?: string }>) ?? []).map(c => c.text ?? '').join('');
    if (style === 'h2') return `## ${text}`;
    if (style === 'h3') return `### ${text}`;
    return text;
  }).filter(Boolean).join('\n\n');
}

function extractImageBlocks(body: unknown[]): ImageBlock[] {
  if (!Array.isArray(body)) return [];
  return body
    .filter((b: unknown) => (b as Record<string, unknown>)._type === 'image' && (b as Record<string, unknown>).assetUrl)
    .map((b: unknown) => {
      const block = b as Record<string, unknown>;
      return {
        _key: String(block._key ?? ''),
        assetUrl: String(block.assetUrl ?? ''),
        assetRef: String(block.assetRef ?? ''),
        alt: String(block.alt ?? ''),
      };
    });
}

export default function DraftClient({ draftId }: { draftId: string }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  // Editable fields
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [category, setCategory] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [preview, setPreview] = useState(false);
  const [imageBlocks, setImageBlocks] = useState<ImageBlock[]>([]);
  const [altEdits, setAltEdits] = useState<Record<string, string>>({});
  const [shopBlocks, setShopBlocks] = useState<ShopBlock[]>([]);
  const [sheetTab, setSheetTab] = useState('');
  const [rowNumber, setRowNumber] = useState('');

  useEffect(() => {
    fetch(`/api/drafts/${encodeURIComponent(draftId)}`)
      .then(r => r.json())
      .then(data => {
        const d: Draft = data.draft;
        setDraft(d);
        setTitle(d.title ?? '');
        setSlug(d.slug ?? '');
        setCategory(d.category ?? '');
        setBodyText(extractBodyMarkdown(d.body));
        setImageBlocks(extractImageBlocks(d.body));
        setShopBlocks(d.shopBlocks ?? []);
      })
      .catch(() => setErr('Failed to load draft'))
      .finally(() => setLoading(false));
  }, [draftId]);

  async function handleSave() {
    setSaving(true); setMsg(''); setErr('');
    try {
      const res = await fetch('/api/update-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: draftId, title, slug, category }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setMsg('Saved.');
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveAltTexts() {
    setSaving(true); setMsg(''); setErr('');
    try {
      // Fetch full draft body, update alt texts, re-save body
      const res = await fetch(`/api/drafts/${encodeURIComponent(draftId)}`);
      const data = await res.json();
      const fullBody: unknown[] = data.draft.body;
      const updated = fullBody.map((b: unknown) => {
        const block = b as Record<string, unknown>;
        if (block._type !== 'image') return block;
        const key = String(block._key ?? '');
        if (altEdits[key] !== undefined) return { ...block, alt: altEdits[key] };
        return block;
      });
      const patchRes = await fetch('/api/update-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: draftId, body: updated }),
      });
      if (!patchRes.ok) throw new Error('Failed to save alt texts');
      setMsg('Alt texts saved.');
      setAltEdits({});
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveImage(key: string) {
    // Remove image block from body
    const res = await fetch(`/api/drafts/${encodeURIComponent(draftId)}`);
    const data = await res.json();
    const fullBody: unknown[] = data.draft.body;
    const updated = fullBody.filter((b: unknown) => (b as Record<string, unknown>)._key !== key);
    await fetch('/api/update-draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: draftId, body: updated }),
    });
    setImageBlocks(prev => prev.filter(img => img._key !== key));
    setMsg('Image removed.');
  }

  async function handleRemoveShopBlock(idx: number) {
    const updated = shopBlocks.filter((_, i) => i !== idx);
    setShopBlocks(updated);
    await fetch('/api/update-draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: draftId, shopBlocks: updated }),
    });
    setMsg('Shop block removed.');
  }

  async function handleMoveShopBlock(idx: number, dir: -1 | 1) {
    const updated = [...shopBlocks];
    const swap = idx + dir;
    if (swap < 0 || swap >= updated.length) return;
    [updated[idx], updated[swap]] = [updated[swap], updated[idx]];
    setShopBlocks(updated);
    await fetch('/api/update-draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: draftId, shopBlocks: updated }),
    });
  }

  async function handlePublish() {
    if (!confirm('Publish this draft? It will go live on decoreixy.com after the site rebuilds (~3 min).')) return;
    setPublishing(true); setMsg(''); setErr('');
    try {
      const res = await fetch('/api/publish-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          draftId,
          sheetTab: sheetTab || undefined,
          rowNumber: rowNumber ? parseInt(rowNumber, 10) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Publish failed');
      setMsg(`Published! Live at: decoreixy.com/${category}/${data.slug}/`);
      setTimeout(() => router.push('/drafts'), 2500);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Publish failed');
    } finally {
      setPublishing(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this draft permanently? This cannot be undone.')) return;
    setDeleting(true);
    try {
      await fetch(`/api/drafts/${encodeURIComponent(draftId)}`, { method: 'DELETE' });
      router.push('/drafts');
    } catch {
      setErr('Delete failed');
      setDeleting(false);
    }
  }

  if (loading) return <p style={{ padding: 32, color: 'var(--t3)' }}>Loading draft…</p>;
  if (!draft) return <p style={{ padding: 32, color: '#e05252' }}>{err || 'Draft not found'}</p>;

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'var(--bg)', border: '1px solid var(--border)',
    borderRadius: 6, color: '#FDFAF6', padding: '8px 10px', fontSize: 13,
    fontFamily: 'inherit', boxSizing: 'border-box',
  };

  return (
    <div style={{ padding: '24px', maxWidth: 860, margin: '0 auto', paddingBottom: 60 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <button onClick={() => router.push('/drafts')} style={{ background: 'none', border: 'none', color: 'var(--t3)', cursor: 'pointer', fontSize: 13 }}>← Drafts</button>
        <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#FDFAF6', flex: 1 }}>Review Draft</h1>
      </div>

      {msg && <div style={{ background: '#1a3a2a', border: '1px solid var(--sage)', borderRadius: 6, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: 'var(--sage)' }}>{msg}</div>}
      {err && <div style={{ background: '#3a1a1a', border: '1px solid #e05252', borderRadius: 6, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#e05252' }}>{err}</div>}

      {/* Meta fields */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '20px', marginBottom: 20 }}>
        <p style={{ margin: '0 0 14px', fontWeight: 700, fontSize: 13, color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Article Info</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12, color: 'var(--t3)' }}>
            Title
            <input value={title} onChange={e => setTitle(e.target.value)} style={inputStyle} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12, color: 'var(--t3)' }}>
            Slug
            <input value={slug} onChange={e => setSlug(e.target.value)} style={inputStyle} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12, color: 'var(--t3)' }}>
            Category
            <input value={category} onChange={e => setCategory(e.target.value)} style={inputStyle} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12, color: 'var(--t3)' }}>
            Type
            <input value={draft.type} readOnly style={{ ...inputStyle, opacity: 0.6 }} />
          </label>
        </div>
        <button onClick={handleSave} disabled={saving} style={{ background: 'var(--sage)', border: 'none', borderRadius: 6, color: '#fff', padding: '8px 18px', fontSize: 13, fontWeight: 700, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.6 : 1 }}>
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>

      {/* Featured image */}
      {draft.featuredImageUrl && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '20px', marginBottom: 20 }}>
          <p style={{ margin: '0 0 12px', fontWeight: 700, fontSize: 13, color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Featured Image</p>
          <img src={draft.featuredImageUrl} alt="Featured" style={{ maxWidth: '100%', maxHeight: 300, objectFit: 'cover', borderRadius: 6, display: 'block' }} />
        </div>
      )}

      {/* Body preview */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '20px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Article Body</p>
          <button onClick={() => setPreview(p => !p)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--t3)', fontSize: 11, padding: '3px 10px', cursor: 'pointer' }}>
            {preview ? 'Edit' : 'Preview'}
          </button>
        </div>
        {preview ? (
          <div style={{ fontSize: 13, color: '#FDFAF6', lineHeight: 1.7, whiteSpace: 'pre-wrap', maxHeight: 500, overflowY: 'auto', padding: '10px 0' }}>
            {bodyText}
          </div>
        ) : (
          <textarea
            value={bodyText}
            onChange={e => setBodyText(e.target.value)}
            rows={18}
            style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6, fontSize: 12, fontFamily: 'monospace' }}
            placeholder="Article body will appear here as plain text extracted from Sanity portable text. Editing here does not update the draft — use Update Body below."
          />
        )}
        <p style={{ margin: '8px 0 0', fontSize: 11, color: 'var(--t3)' }}>
          This shows extracted text from the portable text body. To update the body, use the agent's update_draft tool or the Edit page.
        </p>
      </div>

      {/* Section images */}
      {imageBlocks.length > 0 && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '20px', marginBottom: 20 }}>
          <p style={{ margin: '0 0 14px', fontWeight: 700, fontSize: 13, color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Section Images ({imageBlocks.length})</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {imageBlocks.map(img => (
              <div key={img._key} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: '10px', background: 'var(--bg)', borderRadius: 6, border: '1px solid var(--border)' }}>
                <img src={`${img.assetUrl}?w=140&h=140&fit=crop&auto=format`} alt={img.alt} style={{ width: 90, height: 90, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12, color: 'var(--t3)', marginBottom: 8 }}>
                    Alt text
                    <input
                      value={altEdits[img._key] ?? img.alt}
                      onChange={e => setAltEdits(prev => ({ ...prev, [img._key]: e.target.value }))}
                      style={inputStyle}
                    />
                  </label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => handleSaveAltTexts()} style={{ fontSize: 11, background: 'var(--sage)', border: 'none', borderRadius: 4, color: '#fff', padding: '4px 10px', cursor: 'pointer' }}>
                      Save alt
                    </button>
                    <button onClick={() => handleRemoveImage(img._key)} style={{ fontSize: 11, background: '#3a1a1a', border: '1px solid #e05252', borderRadius: 4, color: '#e05252', padding: '4px 10px', cursor: 'pointer' }}>
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Shop blocks */}
      {shopBlocks.length > 0 && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '20px', marginBottom: 20 }}>
          <p style={{ margin: '0 0 14px', fontWeight: 700, fontSize: 13, color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Shop Blocks ({shopBlocks.length})</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {shopBlocks.map((block, idx) => (
              <div key={idx} style={{ background: 'var(--bg)', borderRadius: 6, border: '1px solid var(--border)', padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#FDFAF6' }}>
                    After: &ldquo;{block.afterHeading}&rdquo;
                    <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--t3)', fontWeight: 400 }}>{block.headingLevel} · {block.products?.length ?? 0} product{block.products?.length !== 1 ? 's' : ''}</span>
                  </p>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {idx > 0 && <button onClick={() => handleMoveShopBlock(idx, -1)} style={{ fontSize: 11, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--t3)', padding: '3px 8px', cursor: 'pointer' }}>↑</button>}
                    {idx < shopBlocks.length - 1 && <button onClick={() => handleMoveShopBlock(idx, 1)} style={{ fontSize: 11, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--t3)', padding: '3px 8px', cursor: 'pointer' }}>↓</button>}
                    <button onClick={() => handleRemoveShopBlock(idx)} style={{ fontSize: 11, background: '#3a1a1a', border: '1px solid #e05252', borderRadius: 4, color: '#e05252', padding: '3px 8px', cursor: 'pointer' }}>Remove</button>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {(block.products ?? []).map((p, pi) => (
                    <div key={pi} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--surface)', borderRadius: 4, padding: '5px 8px', border: '1px solid var(--border)' }}>
                      {p.imageUrl && <img src={p.imageUrl} alt={p.name} style={{ width: 32, height: 32, objectFit: 'contain', borderRadius: 2 }} />}
                      <span style={{ fontSize: 11, color: 'var(--t2)' }}>{p.name}</span>
                      <span style={{ fontSize: 11, color: 'var(--sage)', fontWeight: 700 }}>${p.price}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sheet row (optional, for updating status after publish) */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '20px', marginBottom: 24 }}>
        <p style={{ margin: '0 0 12px', fontWeight: 700, fontSize: 13, color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Queue Row (optional)</p>
        <p style={{ margin: '0 0 12px', fontSize: 12, color: 'var(--t3)' }}>Fill these to mark the article as published in Google Sheets after publishing.</p>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12, color: 'var(--t3)' }}>
            Sheet tab name (e.g. &ldquo;Japandi — Bedroom&rdquo;)
            <input value={sheetTab} onChange={e => setSheetTab(e.target.value)} style={inputStyle} placeholder="Seasonal — Christmas + Winter" />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12, color: 'var(--t3)' }}>
            Row number
            <input value={rowNumber} onChange={e => setRowNumber(e.target.value)} style={inputStyle} placeholder="12" type="number" />
          </label>
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
        <button onClick={handleDelete} disabled={deleting} style={{ background: 'transparent', border: '1px solid #e05252', borderRadius: 7, color: '#e05252', padding: '11px 22px', fontSize: 13, fontWeight: 700, cursor: deleting ? 'default' : 'pointer', opacity: deleting ? 0.6 : 1 }}>
          {deleting ? 'Deleting…' : '✕ Delete Draft'}
        </button>
        <button onClick={handlePublish} disabled={publishing} style={{ background: publishing ? '#3d7a68' : 'var(--sage)', border: 'none', borderRadius: 7, color: '#fff', padding: '11px 28px', fontSize: 13, fontWeight: 700, cursor: publishing ? 'default' : 'pointer', opacity: publishing ? 0.8 : 1 }}>
          {publishing ? 'Publishing…' : '✓ Publish Now'}
        </button>
      </div>
    </div>
  );
}
