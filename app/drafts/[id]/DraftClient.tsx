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
  cluster: string | null; kicker: string; _createdAt: string; _updatedAt: string;
  featuredImageUrl?: string; featuredImageRef?: string;
  body: unknown[]; shopBlocks: ShopBlock[]; productItems: unknown[];
  hasPublishedVersion?: boolean;
}

function extractBodyText(body: unknown[]): string {
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

// --- shared input style (light theme)
const inp: React.CSSProperties = {
  width: '100%', background: '#fff', border: '1px solid var(--border)',
  borderRadius: 6, color: 'var(--t1)', padding: '8px 10px', fontSize: 13,
  fontFamily: 'inherit', boxSizing: 'border-box',
};

const card: React.CSSProperties = {
  background: '#fff', border: '1px solid var(--border)', borderRadius: 8,
  padding: '20px', marginBottom: 20,
};

const cardLabel: React.CSSProperties = {
  margin: '0 0 14px', fontWeight: 700, fontSize: 11, color: 'var(--t2)',
  textTransform: 'uppercase', letterSpacing: '0.08em',
};

export default function DraftClient({ draftId }: { draftId: string }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

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
        setBodyText(extractBodyText(d.body));
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
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: draftId, title, slug, category }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setMsg('Saved.');
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Save failed');
    } finally { setSaving(false); }
  }

  async function handleSaveAltTexts() {
    setSaving(true); setMsg(''); setErr('');
    try {
      const res = await fetch(`/api/drafts/${encodeURIComponent(draftId)}`);
      const data = await res.json();
      const fullBody: unknown[] = data.draft.body;
      const updated = fullBody.map((b: unknown) => {
        const block = b as Record<string, unknown>;
        if (block._type !== 'image') return block;
        const key = String(block._key ?? '');
        return altEdits[key] !== undefined ? { ...block, alt: altEdits[key] } : block;
      });
      const patchRes = await fetch('/api/update-draft', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: draftId, body: updated }),
      });
      if (!patchRes.ok) throw new Error('Failed to save alt texts');
      setMsg('Alt texts saved.');
      setAltEdits({});
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Failed');
    } finally { setSaving(false); }
  }

  async function handleRemoveImage(key: string) {
    const res = await fetch(`/api/drafts/${encodeURIComponent(draftId)}`);
    const data = await res.json();
    const updated = (data.draft.body as unknown[]).filter(
      (b: unknown) => (b as Record<string, unknown>)._key !== key,
    );
    await fetch('/api/update-draft', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: draftId, body: updated }),
    });
    setImageBlocks(prev => prev.filter(img => img._key !== key));
    setMsg('Image removed.');
  }

  async function handleRemoveShopBlock(idx: number) {
    const updated = shopBlocks.filter((_, i) => i !== idx);
    setShopBlocks(updated);
    await fetch('/api/update-draft', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
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
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: draftId, shopBlocks: updated }),
    });
  }

  async function handlePublish() {
    if (!confirm('Publish this draft? It will go live on decoreixy.com after the site rebuilds (~3 min).')) return;
    setPublishing(true); setMsg(''); setErr('');
    try {
      const res = await fetch('/api/publish-draft', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
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
    } finally { setPublishing(false); }
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

  if (loading) return <p style={{ padding: 32, color: 'var(--t2)', fontSize: 14 }}>Loading draft…</p>;
  if (!draft) return <p style={{ padding: 32, color: 'var(--amber)', fontSize: 14 }}>{err || 'Draft not found'}</p>;

  return (
    <div style={{ padding: '0', maxWidth: 860, margin: '0 auto', paddingBottom: 80 }}>

      {/* ── STICKY ACTION BAR ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: '#fff', borderBottom: '1px solid var(--border)',
        padding: '10px 24px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => router.push('/drafts')} style={{ background: 'none', border: 'none', color: 'var(--t2)', cursor: 'pointer', fontSize: 13, padding: 0 }}>
            ← Drafts
          </button>
          <span style={{ color: 'var(--border2)', fontSize: 12 }}>|</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)', maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {title || draft.title}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button
            onClick={handleDelete}
            disabled={deleting}
            style={{ background: 'transparent', border: '1px solid #DC2626', borderRadius: 6, color: '#DC2626', padding: '7px 16px', fontSize: 13, fontWeight: 700, cursor: deleting ? 'default' : 'pointer', opacity: deleting ? 0.6 : 1 }}
          >
            {deleting ? 'Deleting…' : '✕ Delete'}
          </button>
          <button
            onClick={handlePublish}
            disabled={publishing}
            style={{ background: publishing ? 'var(--sage)' : 'var(--sage)', border: 'none', borderRadius: 6, color: '#fff', padding: '7px 20px', fontSize: 13, fontWeight: 700, cursor: publishing ? 'default' : 'pointer', opacity: publishing ? 0.7 : 1 }}
          >
            {publishing ? 'Publishing…' : '✓ Publish Now'}
          </button>
        </div>
      </div>

      <div style={{ padding: '20px 24px' }}>

        {/* Published-version warning */}
        {draft.hasPublishedVersion && (
          <div style={{ background: '#FEF9C3', border: '1px solid #EAB308', borderRadius: 8, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#78350F', fontWeight: 600 }}>
            ⚠ This is an unpublished edit of a <strong>LIVE article</strong>. Publishing will replace the live version.
          </div>
        )}

        {msg && (
          <div style={{ background: 'var(--sbg)', border: '1px solid var(--sage)', borderRadius: 6, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: 'var(--sage)', fontWeight: 600 }}>
            {msg}
          </div>
        )}
        {err && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 6, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#991B1B' }}>
            {err}
          </div>
        )}

        {/* ── Meta fields ── */}
        <div style={card}>
          <p style={cardLabel}>Article Info</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            {([
              ['Title', title, setTitle],
              ['Slug', slug, setSlug],
              ['Category', category, setCategory],
            ] as [string, string, React.Dispatch<React.SetStateAction<string>>][]).map(([label, val, setter]) => (
              <label key={label} style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: 'var(--t2)' }}>
                {label}
                <input value={val} onChange={e => setter(e.target.value)} style={inp} />
              </label>
            ))}
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: 'var(--t2)' }}>
              Type
              <input value={draft.type} readOnly style={{ ...inp, background: 'var(--bg)', color: 'var(--t2)' }} />
            </label>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button onClick={handleSave} disabled={saving} className="btn btn-sage btn-sm">
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            <span style={{ fontSize: 11, color: 'var(--t3)' }}>
              Created {new Date(draft._createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              {' · '}
              Updated {new Date(draft._updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
        </div>

        {/* ── Featured image ── */}
        {draft.featuredImageUrl && (
          <div style={card}>
            <p style={cardLabel}>Featured Image</p>
            <img
              src={`${draft.featuredImageUrl}?w=600&h=200&fit=crop&auto=format`}
              alt="Featured"
              style={{ maxWidth: '100%', height: 180, objectFit: 'cover', borderRadius: 6, display: 'block' }}
            />
          </div>
        )}

        {/* ── Article body ── */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <p style={{ ...cardLabel, margin: 0 }}>Article Body</p>
            <button onClick={() => setPreview(p => !p)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--t2)', fontSize: 11, padding: '3px 10px', cursor: 'pointer' }}>
              {preview ? 'Edit' : 'Preview'}
            </button>
          </div>
          {preview ? (
            <div style={{ fontSize: 13, color: 'var(--t1)', lineHeight: 1.7, whiteSpace: 'pre-wrap', maxHeight: 480, overflowY: 'auto', padding: '8px 0', borderTop: '1px solid var(--border)' }}>
              {bodyText}
            </div>
          ) : (
            <textarea
              value={bodyText}
              onChange={e => setBodyText(e.target.value)}
              rows={16}
              style={{ ...inp, resize: 'vertical', lineHeight: 1.6, fontSize: 12, fontFamily: 'monospace' }}
            />
          )}
          <p style={{ margin: '8px 0 0', fontSize: 11, color: 'var(--t3)' }}>
            Read-only preview of the portable text body. To update content, use the agent&apos;s update_draft tool.
          </p>
        </div>

        {/* ── Section images ── */}
        {imageBlocks.length > 0 && (
          <div style={card}>
            <p style={cardLabel}>Section Images ({imageBlocks.length})</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {imageBlocks.map(img => (
                <div key={img._key} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: 10, background: 'var(--bg)', borderRadius: 6, border: '1px solid var(--border)' }}>
                  <img
                    src={`${img.assetUrl}?w=120&h=120&fit=crop&auto=format`}
                    alt={img.alt}
                    style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }}
                  />
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: 'var(--t2)', marginBottom: 8 }}>
                      Alt text
                      <input
                        value={altEdits[img._key] ?? img.alt}
                        onChange={e => setAltEdits(prev => ({ ...prev, [img._key]: e.target.value }))}
                        style={inp}
                      />
                    </label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={handleSaveAltTexts} className="btn btn-sage btn-sm">Save alt</button>
                      <button onClick={() => handleRemoveImage(img._key)} style={{ fontSize: 12, background: 'transparent', border: '1px solid #DC2626', borderRadius: 4, color: '#DC2626', padding: '4px 10px', cursor: 'pointer' }}>
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Shop blocks ── */}
        {shopBlocks.length > 0 && (
          <div style={card}>
            <p style={cardLabel}>Shop Blocks ({shopBlocks.length})</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {shopBlocks.map((block, idx) => (
                <div key={idx} style={{ background: 'var(--bg)', borderRadius: 6, border: '1px solid var(--border)', padding: '10px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)' }}>
                      After: &ldquo;{block.afterHeading}&rdquo;
                      <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--t3)', fontWeight: 400 }}>
                        {block.headingLevel} · {block.products?.length ?? 0} product{block.products?.length !== 1 ? 's' : ''}
                      </span>
                    </span>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {idx > 0 && <button onClick={() => handleMoveShopBlock(idx, -1)} style={{ fontSize: 11, background: '#fff', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--t2)', padding: '3px 8px', cursor: 'pointer' }}>↑</button>}
                      {idx < shopBlocks.length - 1 && <button onClick={() => handleMoveShopBlock(idx, 1)} style={{ fontSize: 11, background: '#fff', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--t2)', padding: '3px 8px', cursor: 'pointer' }}>↓</button>}
                      <button onClick={() => handleRemoveShopBlock(idx)} style={{ fontSize: 11, background: 'transparent', border: '1px solid #DC2626', borderRadius: 4, color: '#DC2626', padding: '3px 8px', cursor: 'pointer' }}>Remove</button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {(block.products ?? []).map((p, pi) => (
                      <div key={pi} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff', borderRadius: 4, padding: '5px 8px', border: '1px solid var(--border)' }}>
                        {p.imageUrl && <img src={p.imageUrl} alt={p.name} style={{ width: 28, height: 28, objectFit: 'contain', borderRadius: 2 }} />}
                        <span style={{ fontSize: 11, color: 'var(--t1)' }}>{p.name}</span>
                        <span style={{ fontSize: 11, color: 'var(--sage)', fontWeight: 700 }}>${p.price}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Queue row for sheet update after publish ── */}
        <div style={card}>
          <p style={cardLabel}>Queue Row (optional)</p>
          <p style={{ margin: '0 0 12px', fontSize: 12, color: 'var(--t2)' }}>
            Fill these to mark the article as published in Google Sheets after publishing.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: 'var(--t2)' }}>
              Sheet tab (e.g. &ldquo;Seasonal — Christmas + Winter&rdquo;)
              <input value={sheetTab} onChange={e => setSheetTab(e.target.value)} style={inp} placeholder="Japandi — Bedroom" />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: 'var(--t2)' }}>
              Row number
              <input value={rowNumber} onChange={e => setRowNumber(e.target.value)} style={inp} placeholder="12" type="number" />
            </label>
          </div>
        </div>

      </div>
    </div>
  );
}
