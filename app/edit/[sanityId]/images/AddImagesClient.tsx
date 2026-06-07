'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

type SectionImg = { headingText: string; prompt: string; enabled: boolean; url: string | null };

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
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: filename,
        types: [{ description: 'Image', accept: { 'image/jpeg': ['.jpg'] } }],
      });
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
  const [generatingPrompts, setGeneratingPrompts] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState<string | null>(null);
  const [articleMarkdown, setArticleMarkdown] = useState('');

  useEffect(() => {
    fetch(`/api/edit-article?id=${sanityId}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); return; }
        setTitle(data.title);
        setCategory(data.category);
        setSlug(data.slug);
        setArticleMarkdown(data.markdown ?? '');

        // Extract both H2 and H3 headings
        const headings = data.markdown
          .split('\n')
          .filter((l: string) => l.startsWith('## ') || l.startsWith('### '))
          .map((l: string) => l.replace(/^#{2,3} /, '').trim())
          .filter((h: string) => h.length > 0);

        // Restore any previously generated URLs from localStorage
        const savedRaw = localStorage.getItem(`add-images-${sanityId}`);
        let savedUrls: Record<string, string> = {};
        let savedPrompts: Record<string, string> = {};
        let savedEnabled: Record<string, boolean> = {};
        if (savedRaw) {
          try {
            const parsed = JSON.parse(savedRaw);
            savedUrls = parsed.urls ?? {};
            savedPrompts = parsed.prompts ?? {};
            savedEnabled = parsed.enabled ?? {};
          } catch { /* ignore */ }
        }

        setSections(headings.map((h: string) => ({
          headingText: h,
          prompt: savedPrompts[h] ?? '',
          enabled: savedEnabled[h] !== undefined ? savedEnabled[h] : true,
          url: savedUrls[h] ?? null,
        })));
      })
      .catch(() => setError('Failed to load article'))
      .finally(() => setLoading(false));
  }, [sanityId]);

  // Persist sections to localStorage whenever they change
  const persistSections = (secs: SectionImg[]) => {
    const urls: Record<string, string> = {};
    const prompts: Record<string, string> = {};
    const enabled: Record<string, boolean> = {};
    for (const s of secs) {
      if (s.url) urls[s.headingText] = s.url;
      if (s.prompt) prompts[s.headingText] = s.prompt;
      enabled[s.headingText] = s.enabled;
    }
    localStorage.setItem(`add-images-${sanityId}`, JSON.stringify({ urls, prompts, enabled }));
  };

  const generatePrompts = async () => {
    // Only generate prompts for enabled (checked) sections — skip unchecked to save tokens
    const enabledSections = sections.filter(s => s.enabled);
    const headings = enabledSections.map(s => s.headingText);
    if (!headings.length) return;
    setGeneratingPrompts(true); setError('');
    try {
      const res = await fetch('/api/generate-image-prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleTitle: title, category, headings, articleMarkdown, includePins: false }),
      });
      const result = await res.json();
      if (!res.ok || !result.sectionPrompts) throw new Error(result.error ?? 'Failed to generate prompts');
      // Match prompts back by heading text, not by index
      const promptMap = Object.fromEntries(
        headings.map((h, i) => [h, result.sectionPrompts[i] ?? ''])
      );
      const updated = sections.map(s => ({
        ...s,
        prompt: promptMap[s.headingText] ?? s.prompt,
      }));
      setSections(updated);
      persistSections(updated);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Prompt generation failed');
    } finally {
      setGeneratingPrompts(false);
    }
  };

  const generateImages = async () => {
    const enabled = sections.filter(s => s.enabled && s.prompt.trim());
    if (!enabled.length) { setError('Generate prompts first, then generate images.'); return; }
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
            prompts: batch.map(s => ({
              prompt: s.prompt,
              model: 'schnell',
              label: s.headingText,
              width: 1000,
              height: 1500,
            })),
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
        persistSections([...newSections]);
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
            altText: `${s.headingText.replace(/^\d+\.\s*/, '')} – Japandi ${category.replace('-', ' ')} · ${title}`,
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
  const promptsReady = sections.filter(s => s.prompt.trim()).length;

  if (loading) return <div className="wsbody" style={{ padding: 40, color: 'var(--t3)' }}>Loading…</div>;

  return (
    <div className="wsbody">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.09em', color: 'var(--t3)', marginBottom: 4 }}>
            Add section images — published article
          </div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 400, maxWidth: 600 }}>{title}</div>
          <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 3 }}>
            {sections.length} sections (H2+H3) · {enabledCount} enabled · {promptsReady} prompts ready · {generatedCount} generated
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <Link href={`/edit/${sanityId}`} className="btn btn-out btn-sm">← Edit text</Link>
          {generatedCount > 0 && !saved && (
            <button className="btn btn-sage" onClick={handleSaveToSanity} disabled={saving}>
              {saving ? '⟳ Saving…' : `↑ Save ${generatedCount} images to site`}
            </button>
          )}
          {saved && (
            <button className="btn btn-out btn-sm" onClick={() => setSaved(false)}>
              ↑ Re-save to site
            </button>
          )}
        </div>
      </div>

      {/* Step guide */}
      <div style={{ background: 'var(--sbg)', border: '1px solid #C8D9C0', borderRadius: 'var(--r)', padding: '12px 16px', marginBottom: 16, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ fontSize: 12, color: 'var(--t2)', fontWeight: 500 }}>Step 1:</div>
        <button className="btn btn-amber" onClick={generatePrompts} disabled={generatingPrompts || sections.length === 0}>
          {generatingPrompts ? '⟳ Claude is writing prompts…' : '✦ Generate image prompts with Claude'}
        </button>
        <div style={{ fontSize: 12, color: 'var(--t3)' }}>Claude writes a detailed scene for each section → you review + edit → then generate images</div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <button className="btn btn-dark" onClick={generateImages} disabled={generating || promptsReady === 0}>
          {generating ? '⟳ Generating images…' : `⚡ Generate all images (FLUX Schnell · 1000×1500px)`}
        </button>
        {generating && <span style={{ fontSize: 12, color: 'var(--t3)', alignSelf: 'center' }}>Batching in groups of 3…</span>}
      </div>

      {error && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 'var(--r)', padding: '10px 14px', color: '#991B1B', fontSize: 13, marginBottom: 14 }}>
          ✕ {error}
        </div>
      )}

      {saved && (
        <div style={{ background: 'var(--sbg)', border: '1px solid #C8D9C0', borderRadius: 'var(--r)', padding: '12px 16px', marginBottom: 14, fontSize: 13, color: 'var(--sage)' }}>
          ✓ Images saved — Cloudflare rebuilds in ~3 min.{' '}
          <a href={`https://wabidecor.com/${category}/${slug}`} target="_blank" rel="noopener" style={{ color: 'var(--sage)', fontWeight: 700 }}>View live ↗</a>
        </div>
      )}

      {/* Section list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {sections.map((s, i) => (
          <div key={i} style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--r)', padding: '12px 14px',
            opacity: s.enabled ? 1 : 0.45,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <input
                type="checkbox"
                checked={s.enabled}
                onChange={e => { const n = sections.map((x, j) => j === i ? { ...x, enabled: e.target.checked } : x); setSections(n); persistSections(n); }}
              />
              <span style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>{s.headingText}</span>
              {s.url && (
                <button
                  className="btn btn-out btn-sm"
                  style={{ fontSize: 10 }}
                  onClick={async () => {
                    setDownloading(`sec-${i}`);
                    await downloadImage(s.url!, `${s.headingText.slice(0, 25).replace(/\s+/g, '-').toLowerCase()}.jpg`).catch(() => {});
                    setDownloading(null);
                  }}
                  disabled={downloading === `sec-${i}`}
                >
                  {downloading === `sec-${i}` ? '⟳' : '↓'} Download
                </button>
              )}
            </div>

            {/* Prompt */}
            <textarea
              className="prompt-ta"
              value={s.prompt}
              placeholder={generatingPrompts ? 'Claude is generating…' : 'Click "Generate image prompts with Claude" above to auto-fill, or type your own scene description here…'}
              onChange={e => { const n = sections.map((x, j) => j === i ? { ...x, prompt: e.target.value } : x); setSections(n); persistSections(n); }}
              disabled={!s.enabled}
            />

            {/* Generated image */}
            {s.url && (
              <div style={{ marginTop: 8, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <img src={s.url} alt={s.headingText} style={{ width: 72, aspectRatio: '2/3', objectFit: 'cover', borderRadius: 4 }} />
                <span style={{ fontSize: 11, color: 'var(--sage)', marginTop: 4 }}>✓ Generated</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {sections.length === 0 && !loading && (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--t3)', fontSize: 14 }}>
          No headings found in this article.
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .prompt-ta { width: 100%; font-size: 11px; font-family: inherit; line-height: 1.55; color: var(--t2); border: 1px solid var(--border); border-radius: 4px; padding: 7px 10px; resize: vertical; background: white; min-height: 52px; box-sizing: border-box; outline: none; }
        .prompt-ta:focus { border-color: var(--amber); }
        .prompt-ta:disabled { background: var(--sbg); cursor: not-allowed; }
        .prompt-ta::placeholder { color: var(--t3); font-style: italic; }
      ` }} />
    </div>
  );
}
