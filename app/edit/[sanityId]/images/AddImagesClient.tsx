'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

type SectionImg = { headingText: string; prompt: string; enabled: boolean; url: string | null };

const ROOM_CTX: Record<string, string> = {
  bedroom: 'Japandi bedroom, pale oak furniture, linen bedding, ceramic bedside accessories',
  'living-room': 'Japandi living room, low wooden sofa, natural rattan, wabi-sabi ceramics on shelf',
  bathroom: 'Japandi bathroom, stone basin, bamboo accessories, matte neutral tiles',
  kitchen: 'Japandi kitchen, pale oak cabinets, handmade clay ceramics, open shelf',
};
const LIGHTINGS = ['soft morning light filtering through sheer curtains', 'warm golden afternoon sunlight', 'diffused overcast daylight', 'gentle dappled light through bamboo blinds', 'cool north-facing light'];
const ANGLES = ['eye-level interior photography', 'slight low angle', 'three-quarter room view', 'intimate close-up detail shot', 'wide environmental shot'];

function buildPrompt(heading: string, category: string, index: number) {
  const clean = heading.replace(/^(\d+[:.]\s*|idea\s+\d+[:.]\s*)/i, '').trim();
  const room = ROOM_CTX[category] ?? 'Japandi interior, natural materials';
  return `${clean}, ${room}, ${LIGHTINGS[index % LIGHTINGS.length]}, ${ANGLES[index % ANGLES.length]}, editorial interior photography`;
}

function fallbackDownload(blob: Blob, filename: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

async function downloadImage(imageUrl: string, filename: string) {
  const res = await fetch(`/api/proxy-image?url=${encodeURIComponent(imageUrl)}`);
  const blob = await res.blob();
  if ('showSaveFilePicker' in window) {
    try {
      const handle = await (window as any).showSaveFilePicker({ suggestedName: filename, types: [{ description: 'Image', accept: { 'image/jpeg': ['.jpg'] } }] });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    } catch { /* fall through */ }
  }
  fallbackDownload(blob, filename);
}

export default function AddImagesClient({ sanityId }: { sanityId: string }) {
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [slug, setSlug] = useState('');
  const [sections, setSections] = useState<SectionImg[]>([]);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/edit-article?id=${sanityId}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); return; }
        setTitle(data.title);
        setCategory(data.category);
        setSlug(data.slug);

        // Extract H2 headings from markdown
        const headings = data.markdown
          .split('\n')
          .filter((l: string) => l.startsWith('## '))
          .map((l: string) => l.slice(3).trim());

        setSections(headings.map((h: string, i: number) => ({
          headingText: h,
          prompt: buildPrompt(h, data.category, i),
          enabled: true,
          url: null,
        })));
      })
      .catch(() => setError('Failed to load article'))
      .finally(() => setLoading(false));
  }, [sanityId]);

  const generateImages = async () => {
    const enabled = sections.filter(s => s.enabled);
    if (!enabled.length) return;
    setGenerating(true); setError('');
    try {
      const BATCH = 3;
      const newSections = [...sections];
      for (let i = 0; i < enabled.length; i += BATCH) {
        const batch = enabled.slice(i, i + BATCH);
        const res = await fetch('/api/generate-images', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompts: batch.map(s => ({ prompt: s.prompt, model: 'schnell', label: s.headingText, width: 1000, height: 1500 })),
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'Generation failed');
        const urlMap = Object.fromEntries(data.images.map((img: any) => [img.label, img.url]));
        for (const s of batch) {
          const idx = newSections.findIndex(x => x.headingText === s.headingText);
          if (idx !== -1 && urlMap[s.headingText]) {
            newSections[idx] = { ...newSections[idx], url: urlMap[s.headingText] };
          }
        }
        setSections([...newSections]);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveToSanity = async () => {
    const ready = sections.filter(s => s.enabled && s.url);
    if (!ready.length) { setError('Generate images first'); return; }
    setSaving(true); setError('');
    try {
      const res = await fetch('/api/add-section-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sanityId,
          sections: ready.map(s => ({
            headingText: s.headingText,
            imageUrl: s.url,
            altText: `${s.headingText.replace(/^\d+\.\s*/, '')} – Japandi ${(category).replace('-', ' ')} decor · ${title}`,
          })),
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Save failed');
      setSaved(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const enabledCount = sections.filter(s => s.enabled).length;
  const generatedCount = sections.filter(s => s.url).length;

  if (loading) return <div className="wsbody" style={{ padding: 40, color: 'var(--t3)' }}>Loading…</div>;

  return (
    <div className="wsbody">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.09em', color: 'var(--t3)', marginBottom: 4 }}>
            Add section images — published article
          </div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 400, maxWidth: 600 }}>{title}</div>
          <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 3 }}>
            {sections.length} sections · {enabledCount} enabled · {generatedCount} generated · FLUX Schnell · 1000×1500px portrait
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <Link href={`/edit/${sanityId}`} className="btn btn-out btn-sm">← Edit text</Link>
          <button className="btn btn-amber" onClick={generateImages} disabled={generating || enabledCount === 0}>
            {generating ? '⟳ Generating…' : '⚡ Generate all'}
          </button>
          {generatedCount > 0 && (
            <button className="btn btn-sage" onClick={handleSaveToSanity} disabled={saving || saved}>
              {saving ? '⟳ Saving…' : saved ? '✓ Saved to Sanity' : `↑ Save ${generatedCount} images to site`}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 'var(--r)', padding: '10px 14px', color: '#991B1B', fontSize: 13, marginBottom: 14 }}>
          ✕ {error}
        </div>
      )}

      {saved && (
        <div style={{ background: 'var(--sbg)', border: '1px solid #C8D9C0', borderRadius: 'var(--r)', padding: '12px 16px', marginBottom: 14, fontSize: 13, color: 'var(--sage)' }}>
          ✓ Images saved to Sanity — Cloudflare will rebuild the page in ~3 minutes.{' '}
          <a href={`https://wabidecor.com/${category}/${slug}`} target="_blank" rel="noopener" style={{ color: 'var(--sage)', fontWeight: 700 }}>View live ↗</a>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {sections.map((s, i) => (
          <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '12px 14px', opacity: s.enabled ? 1 : 0.45 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <input
                type="checkbox"
                checked={s.enabled}
                onChange={e => setSections(sec => sec.map((x, j) => j === i ? { ...x, enabled: e.target.checked } : x))}
              />
              <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{s.headingText}</span>
              {s.url && (
                <button
                  className="btn btn-out btn-sm"
                  style={{ fontSize: 10 }}
                  onClick={() => { setDownloading(`sec-${i}`); downloadImage(s.url!, `section-${i + 1}-${s.headingText.slice(0, 20).replace(/\s+/g, '-').toLowerCase()}.jpg`).finally(() => setDownloading(null)); }}
                  disabled={downloading === `sec-${i}`}
                >
                  {downloading === `sec-${i}` ? '⟳' : '↓'} Download
                </button>
              )}
            </div>
            <textarea
              className="prompt-ta"
              value={s.prompt}
              onChange={e => setSections(sec => sec.map((x, j) => j === i ? { ...x, prompt: e.target.value } : x))}
              disabled={!s.enabled}
            />
            {s.url && (
              <div style={{ marginTop: 8, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <img src={s.url} alt={s.headingText} style={{ width: 80, aspectRatio: '2/3', objectFit: 'cover', borderRadius: 4 }} />
                <span style={{ fontSize: 11, color: 'var(--sage)', marginTop: 4 }}>✓ Generated</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {sections.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--t3)', fontSize: 14 }}>
          No H2 headings found in this article.
        </div>
      )}

      <style>{`
        .prompt-ta { width: 100%; font-size: 11px; font-family: inherit; line-height: 1.5; color: var(--t2); border: 1px solid var(--border); border-radius: 4px; padding: 6px 8px; resize: vertical; background: white; min-height: 48px; box-sizing: border-box; outline: none; }
        .prompt-ta:focus { border-color: var(--sage); }
        .prompt-ta:disabled { background: var(--sbg); cursor: not-allowed; }
      `}</style>
    </div>
  );
}
