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
  pipelineArticleId?: string;
  featuredImageUrl?: string; featuredImageRef?: string;
  body: unknown[]; shopBlocks: ShopBlock[]; productItems: unknown[];
  hasPublishedVersion?: boolean;
}

type PTSpan = { _type: 'span'; text?: string; marks?: string[] };
type PTMarkDef = { _type: string; _key: string; href?: string };
type PTBlock = { _type: string; _key?: string; style?: string; listItem?: string; level?: number; children?: PTSpan[]; markDefs?: PTMarkDef[]; alt?: string; assetUrl?: string };

function portableTextToMarkdown(body: unknown[]): string {
  if (!Array.isArray(body)) return '';
  const lines: string[] = [];

  for (const raw of body) {
    const block = raw as PTBlock;

    // Image block
    if (block._type === 'image') {
      const alt = block.alt ?? '';
      const rawUrl = block.assetUrl ?? '';
      // Width-only param so the CDN preserves the natural aspect ratio
      const url = rawUrl ? `${rawUrl}?w=640&auto=format` : '';
      lines.push(url ? `![${alt}](${url})` : `[Image: ${alt}]`);
      continue;
    }

    if (block._type !== 'block') continue;

    const style = block.style ?? 'normal';
    const markDefs = block.markDefs ?? [];
    const children = block.children ?? [];

    // Render inline spans with marks
    const inlineText = children.map((span) => {
      let t = span.text ?? '';
      const marks = span.marks ?? [];
      // Links
      const linkMark = marks.find(m => markDefs.some(d => d._key === m && d._type === 'link'));
      if (linkMark) {
        const def = markDefs.find(d => d._key === linkMark);
        t = `[${t}](${def?.href ?? ''})`;
      } else {
        if (marks.includes('strong')) t = `**${t}**`;
        if (marks.includes('em')) t = `*${t}*`;
      }
      return t;
    }).join('');

    if (!inlineText.trim()) continue;

    if (style === 'h1') { lines.push(`# ${inlineText}`); continue; }
    if (style === 'h2') { lines.push(`## ${inlineText}`); continue; }
    if (style === 'h3') { lines.push(`### ${inlineText}`); continue; }
    if (block.listItem === 'bullet') { lines.push(`- ${inlineText}`); continue; }
    lines.push(inlineText);
  }

  return lines.join('\n\n');
}

// ── Rich preview helpers ──────────────────────────────────────────────────────

function fmtDate(iso: string | undefined): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function renderInlineMd(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g;
  let last = 0; let ki = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith('**')) parts.push(<strong key={ki++}>{tok.slice(2, -2)}</strong>);
    else if (tok.startsWith('*')) parts.push(<em key={ki++}>{tok.slice(1, -1)}</em>);
    else { const lm = tok.match(/\[([^\]]+)\]\(([^)]+)\)/); if (lm) parts.push(<a key={ki++} href={lm[2]} target="_blank" rel="noopener" style={{ color: 'var(--sage)' }}>{lm[1]}</a>); }
    last = m.index + tok.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}

function PreviewProductCard({ p, pubDate }: { p: ShopProduct; pubDate: string }) {
  const stars = parseFloat(String(p.stars)) || 0;
  const hasPriceRange = p.low != null && p.high != null && (p.high ?? 0) !== (p.low ?? 0);
  const meterPct = hasPriceRange
    ? Math.round(Math.max(4, Math.min(96, ((p.price - (p.low ?? p.price)) / ((p.high ?? p.price) - (p.low ?? p.price))) * 100)))
    : null;
  return (
    <div style={{ background: '#fff', borderRadius: 8, border: '1.5px solid #5a9e8a', overflow: 'hidden', display: 'flex', flexDirection: 'column', fontSize: 12 }}>
      {p.imageUrl && (
        <div style={{ aspectRatio: '1', background: '#f9f9f9', overflow: 'hidden' }}>
          <img src={p.imageUrl} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 6, boxSizing: 'border-box' }} />
        </div>
      )}
      <div style={{ padding: '10px 10px 12px', flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <p style={{ fontWeight: 700, fontSize: 12, lineHeight: 1.4, margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.name}</p>
        <p style={{ fontSize: 10, color: '#888', margin: 0 }}>{('★').repeat(Math.round(stars))}{('☆').repeat(5 - Math.round(stars))} {stars.toFixed(1)} ({(p.reviews ?? 0).toLocaleString()})</p>
        <p style={{ fontSize: 20, fontWeight: 900, margin: 0, lineHeight: 1 }}>${p.price}</p>
        <p style={{ fontSize: 10, color: '#aaa', margin: 0 }}>Price at time of writing{pubDate ? ` · ${pubDate}` : ''}</p>
        {meterPct !== null && (
          <div style={{ margin: '4px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#888', marginBottom: 2 }}>
              <span style={{ color: '#3d7a68', fontWeight: 700 }}>Low ${p.low}</span>
              <span style={{ color: '#c17a5a', fontWeight: 700 }}>High ${p.high}</span>
            </div>
            <div style={{ position: 'relative', height: 5, borderRadius: 3, background: 'linear-gradient(to right,#5a9e8a,#e8c870,#c17a5a)' }}>
              <div style={{ position: 'absolute', top: '50%', left: `${meterPct}%`, transform: 'translate(-50%,-50%)', width: 11, height: 11, borderRadius: '50%', background: '#fff', border: '2px solid #333' }} />
            </div>
          </div>
        )}
        <a href={p.amazonUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'block', textAlign: 'center', background: '#333', color: '#fff', borderRadius: 5, padding: '8px 6px', fontSize: 10, fontWeight: 700, textDecoration: 'none', marginTop: 'auto' }}>
          See Today&apos;s Price →
        </a>
      </div>
    </div>
  );
}

function renderBodyPreview(
  body: string,
  featuredImageUrl: string | undefined,
  shopBlocks: ShopBlock[],
  createdAt: string,
): React.ReactNode {
  const pubDate = fmtDate(createdAt);
  const normH = (s: string) => s.replace(/^\d+\.\s+/, '').toLowerCase().replace(/[^a-z0-9]/g, '');

  // Split into blocks by BOTH H2 and H3 (matches production site behaviour)
  type Block = { level: 'h2' | 'h3' | null; heading: string | null; lines: string[] };
  const blocks: Block[] = [{ level: null, heading: null, lines: [] }];
  for (const line of body.split('\n')) {
    if (line.startsWith('## '))       blocks.push({ level: 'h2', heading: line.slice(3), lines: [] });
    else if (line.startsWith('### ')) blocks.push({ level: 'h3', heading: line.slice(4), lines: [] });
    else                              blocks[blocks.length - 1].lines.push(line);
  }

  // Pre-assign shop blocks (first heading match, no double-use)
  const usedBlocks = new Set<number>();
  const shopAssignment = new Map<number, number>(); // blockIdx → shopBlockIdx
  blocks.forEach((block, bi) => {
    if (!block.heading) return;
    const idx = shopBlocks.findIndex((sb, i) => !usedBlocks.has(i) && normH(sb.afterHeading) === normH(block.heading!));
    if (idx !== -1) { shopAssignment.set(bi, idx); usedBlocks.add(idx); }
  });

  return (
    <div>
      {featuredImageUrl && (
        <img src={`${featuredImageUrl}?w=820&h=380&fit=crop&auto=format`} alt="Featured"
          style={{ width: '100%', height: 240, objectFit: 'cover', borderRadius: 8, marginBottom: 20, display: 'block' }} />
      )}
      {blocks.map((block, bi) => (
        <div key={bi}>
          {block.level === 'h2' && (
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--t1)', margin: '28px 0 10px', paddingBottom: 6, borderBottom: '1px solid var(--border)' }}>
              {block.heading}
            </h2>
          )}
          {block.level === 'h3' && (
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--t1)', margin: '18px 0 7px' }}>
              {block.heading}
            </h3>
          )}
          {block.lines.map((line, li) => {
            if (!line.trim()) return <div key={li} style={{ height: 6 }} />;
            const imgM = line.match(/!\[([^\]]*)\]\(([^)]+)\)/);
            if (imgM) return (
              <figure key={li} style={{ margin: '14px 0' }}>
                <img src={imgM[2]} alt={imgM[1]} title={imgM[1]} style={{ width: '100%', height: 'auto', display: 'block', borderRadius: 6 }} />
                {imgM[1] && <figcaption style={{ fontSize: 10, color: 'var(--t3)', textAlign: 'center', marginTop: 3, fontStyle: 'italic' }}>{imgM[1]}</figcaption>}
              </figure>
            );
            if (line.startsWith('- ')) return <li key={li} style={{ fontSize: 13, color: 'var(--t1)', lineHeight: 1.65, marginLeft: 18, marginBottom: 3 }}>{renderInlineMd(line.slice(2))}</li>;
            return <p key={li} style={{ fontSize: 13, color: 'var(--t1)', lineHeight: 1.7, margin: '0 0 10px' }}>{renderInlineMd(line)}</p>;
          })}
          {shopAssignment.has(bi) && (() => {
            const block2 = shopBlocks[shopAssignment.get(bi)!];
            return (
              <div style={{ background: '#eef2ef', border: '2px solid #5a9e8a', borderRadius: 10, padding: '16px 14px', margin: '20px 0' }}>
                <p style={{ textAlign: 'center', fontSize: 11, fontWeight: 900, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#3d7a68', marginBottom: 12 }}>Shop The Look</p>
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(block2.products.length, 3)}, 1fr)`, gap: 10 }}>
                  {block2.products.map((prod, pi) => <PreviewProductCard key={pi} p={prod} pubDate={pubDate} />)}
                </div>
              </div>
            );
          })()}
        </div>
      ))}
    </div>
  );
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
  const [originalBodyLen, setOriginalBodyLen] = useState(0);
  const [preview, setPreview] = useState(false);
  const [imageBlocks, setImageBlocks] = useState<ImageBlock[]>([]);
  const [altEdits, setAltEdits] = useState<Record<string, string>>({});
  const [shopBlocks, setShopBlocks] = useState<ShopBlock[]>([]);
  const [sheetTab, setSheetTab] = useState('');
  const [rowNumber, setRowNumber] = useState('');

  useEffect(() => {
    fetch(`/api/drafts/${encodeURIComponent(draftId)}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(data => {
        if (data.error) { setErr(data.error); return; }
        const d: Draft = data.draft;
        setDraft(d);
        setTitle(d.title ?? '');
        setSlug(d.slug ?? '');
        setCategory(d.category ?? '');
        const md = portableTextToMarkdown(d.body);
        setBodyText(md);
        setOriginalBodyLen(md.length);
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
      const res = await fetch(`/api/drafts/${encodeURIComponent(draftId)}`, { cache: 'no-store' });
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
    const res = await fetch(`/api/drafts/${encodeURIComponent(draftId)}`, { cache: 'no-store' });
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

  // Body safety check: block publish/save if body appears empty or was truncated.
  // Only applies when the original body was substantial (>200 chars).
  const bodyIsEmpty = bodyText.trim().length === 0;
  const bodyIsTruncated = originalBodyLen > 200 && bodyText.trim().length < originalBodyLen * 0.8;
  const bodyUnsafe = bodyIsEmpty || bodyIsTruncated;

  async function handlePublish() {
    if (bodyUnsafe) {
      setErr(`Blocked: the body appears empty or much shorter than the saved version (${bodyText.trim().length} chars vs original ${originalBodyLen}). The draft has not been changed — this is a display issue. Do not publish until the body shows correctly.`);
      return;
    }
    if (!confirm('Publish this draft? It will go live on decoreixy.com after the site rebuilds (~3 min).')) return;
    setPublishing(true); setMsg(''); setErr('');
    try {
      // If the draft has no shop blocks but was linked to a pipeline article,
      // pull the pipeline's shop blocks and patch them in before publishing.
      const noShop = !draft || !draft.shopBlocks || draft.shopBlocks.length === 0;
      const pipelineId = draft?.pipelineArticleId;
      if (noShop && pipelineId) {
        try {
          const cacheRes = await fetch(`/api/pipeline-cache?id=${encodeURIComponent(pipelineId)}`);
          if (cacheRes.ok) {
            const cache = await cacheRes.json();
            const blocks = (cache.shop?.blocks ?? []).filter((b: Record<string, unknown>) => b.afterHeading && (b.products as unknown[])?.length > 0);
            if (blocks.length > 0) {
              // Patch the draft with the pipeline shop blocks before publishing
              await fetch('/api/update-draft', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: draftId, shopBlocks: blocks }),
              });
              setShopBlocks(blocks as ShopBlock[]);
            }
          }
        } catch { /* non-fatal — publish will still proceed with current shop blocks */ }
      }

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
      setTimeout(() => { router.refresh(); router.push('/drafts'); }, 2500);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Publish failed');
    } finally { setPublishing(false); }
  }

  async function handleDelete() {
    if (!confirm('Delete this draft permanently? This cannot be undone.')) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/drafts/${encodeURIComponent(draftId)}`, { method: 'DELETE' });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Delete failed'); }
      // Bust router cache so /drafts re-fetches immediately
      router.refresh();
      router.push('/drafts');
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Delete failed');
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
            title={bodyUnsafe ? 'Body is empty or truncated — cannot publish' : ''}
            style={{ background: bodyUnsafe ? '#9CA3AF' : 'var(--sage)', border: 'none', borderRadius: 6, color: '#fff', padding: '7px 20px', fontSize: 13, fontWeight: 700, cursor: publishing ? 'default' : 'pointer', opacity: publishing ? 0.7 : 1 }}
          >
            {publishing ? 'Publishing…' : bodyUnsafe ? '⚠ Body empty' : '✓ Publish Now'}
          </button>
        </div>
      </div>

      <div style={{ padding: '20px 24px' }}>

        {/* Body empty / truncated warning */}
        {bodyUnsafe && originalBodyLen > 0 && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#991B1B', fontWeight: 600 }}>
            ⚠ Body appears empty or much shorter than expected ({bodyText.trim().length} chars vs {originalBodyLen} saved).
            The article content is safe in Sanity — this is a display issue only.
            Publishing is blocked until the body renders correctly.
          </div>
        )}

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
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
              {renderBodyPreview(bodyText, draft.featuredImageUrl, shopBlocks, draft._createdAt)}
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
