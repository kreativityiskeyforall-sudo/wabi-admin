'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import StageBar from '@/components/StageBar';
import type { SheetArticle } from '@/lib/sheets';

type Heading = { level: string; text: string; note: string };

type SectionImg = { headingText: string; prompt: string; enabled: boolean; url: string | null; level?: 'H2' | 'H3' };
type PinImg     = { prompt: string; enabled: boolean; titleOverlay: boolean; url: string | null; layout: 'collage4' | 'hero3panel' | 'complete' };
type FeaturedImg = { prompt: string; url: string | null };

export type ImageStore = {
  featured: FeaturedImg;
  sections: SectionImg[];
  pins: PinImg[];
};

// ─── prompt builders ────────────────────────────────────────────────────────

const ROOM_CTX: Record<string, string> = {
  bedroom:     'Japandi bedroom, pale oak furniture, linen bedding, ceramic bedside accessories',
  'living-room': 'Japandi living room, low wooden sofa, natural rattan, wabi-sabi ceramics on shelf',
  bathroom:    'Japandi bathroom, stone basin, bamboo accessories, matte neutral tiles',
  kitchen:     'Japandi kitchen, pale oak cabinets, handmade clay ceramics, open shelf',
};
const LIGHTINGS = [
  'soft morning light filtering through sheer curtains',
  'warm golden afternoon sunlight',
  'diffused overcast daylight, cool and calm',
  'gentle dappled light through bamboo blinds',
  'quiet north-facing light, shadowless',
];
const ANGLES = [
  'eye-level interior photography',
  'slight low angle looking up',
  'three-quarter room view',
  'intimate close-up detail shot',
  'wide environmental shot',
];
const MOODS = [
  'serene and minimal',
  'warm and inviting',
  'airy and light-filled',
  'calm and meditative',
  'quiet and still',
];

function buildSectionPrompt(heading: string, category: string, index: number): string {
  const clean = heading.replace(/^(idea\s+\d+[:.]\s*|tip\s+\d+[:.]\s*|#\d+\s*[:.]\s*|\d+[:.]\s*)/i, '').trim();
  const room = ROOM_CTX[category] ?? 'Japandi interior, natural materials, wabi-sabi aesthetic';
  return `${clean}, ${room}, ${LIGHTINGS[index % LIGHTINGS.length]}, ${ANGLES[index % ANGLES.length]}, ${MOODS[index % MOODS.length]}, editorial interior photography, high quality`;
}

function buildPinPrompt(category: string, index: number): string {
  const styles = [
    'serene overview of a complete well-styled room',
    'close-up of key decorative elements and natural textures',
    'ambient lifestyle scene with organic props and negative space',
  ];
  const room = ROOM_CTX[category] ?? 'Japandi interior';
  return `${room}, ${styles[index % styles.length]}, warm neutral palette, soft diffused light, wabi-sabi aesthetic, editorial interior photography, portrait format`;
}

function buildFeaturedPrompt(category: string): string {
  const opens: Record<string, string> = {
    bedroom:     'bright airy Japandi bedroom, pale oak platform bed, white linen bedding, large window',
    'living-room': 'bright airy Japandi living room, low wooden sofa, rattan accent chair, ceramic vases, large window',
    bathroom:    'clean Japandi bathroom, stone basin, bamboo bath mat, neutral stone tiles, sheer frosted window',
    kitchen:     'minimal Japandi kitchen, pale oak cabinets, handmade clay ceramics on open shelf, natural light',
  };
  const base = opens[category] ?? 'bright airy Japandi interior, natural materials, minimal decor, large window';
  return `${base}, sheer curtains, warm afternoon light, negative space, landscape orientation, editorial interior photography`;
}

// ─── download utils ──────────────────────────────────────────────────────────

function fallbackDownload(blob: Blob, filename: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

async function saveBlob(blob: Blob, filename: string) {
  if ('showSaveFilePicker' in window) {
    try {
      const ext = filename.split('.').pop() ?? 'jpg';
      const mime = blob.type || 'image/jpeg';
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: filename,
        types: [{ description: 'Image file', accept: { [mime]: [`.${ext}`] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    } catch {
      /* user cancelled or unsupported — fall through */
    }
  }
  fallbackDownload(blob, filename);
}

async function downloadImage(imageUrl: string, filename: string) {
  const res = await fetch(`/api/proxy-image?url=${encodeURIComponent(imageUrl)}`);
  const blob = await res.blob();
  await saveBlob(blob, filename);
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const words = text.split(' ');
  let line = '';
  const lines: string[] = [];
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  const startY = y - (lines.length - 1) * lineHeight;
  lines.forEach((l, i) => ctx.fillText(l, x, startY + i * lineHeight));
}

async function downloadPinWithOverlay(imageUrl: string, titleText: string, filename: string, textPosition: 'bottom' | 'center' = 'bottom') {
  const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(imageUrl)}`;
  const res = await fetch(proxyUrl);
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);

  await new Promise<void>((resolve, reject) => {
    const img = new Image();
    img.onload = async () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1000;
      canvas.height = 1500;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, 1000, 1500);

      if (textPosition === 'center') {
        // Semi-transparent overlay in the middle third
        const grad = ctx.createLinearGradient(0, 450, 0, 1050);
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(0.3, 'rgba(0,0,0,0.65)');
        grad.addColorStop(0.7, 'rgba(0,0,0,0.65)');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 1000, 1500);
        ctx.fillStyle = 'rgba(255,255,255,0.97)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '400 50px Georgia, serif';
        wrapText(ctx, titleText, 500, 750, 860, 64);
      } else {
        // Gradient at bottom
        const grad = ctx.createLinearGradient(0, 900, 0, 1500);
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(0.5, 'rgba(0,0,0,0.6)');
        grad.addColorStop(1, 'rgba(0,0,0,0.82)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 1000, 1500);
        ctx.fillStyle = 'rgba(255,255,255,0.95)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '400 50px Georgia, serif';
        wrapText(ctx, titleText, 500, 1360, 860, 64);
      }

      canvas.toBlob(async (cb) => {
        URL.revokeObjectURL(objectUrl);
        if (!cb) { reject(new Error('Canvas blob failed')); return; }
        await saveBlob(cb, filename);
        resolve();
      }, 'image/jpeg', 0.92);
    };
    img.onerror = reject;
    img.src = objectUrl;
  });
}

// ─── component ───────────────────────────────────────────────────────────────

export default function ImagesClient({ id, article }: { id: string; article: SheetArticle | null }) {
  const isProduct = article?.type === 'product-review';
  const category = article?.category?.toLowerCase().replace(/ /g, '-') ?? 'living-room';
  const articleTitle = article?.title ?? '';

  const [featured, setFeatured] = useState<FeaturedImg>({ prompt: buildFeaturedPrompt(category), url: null });
  const [sections, setSections] = useState<SectionImg[]>([]);
  const [generatingPrompts, setGeneratingPrompts] = useState(false);
  const [pins, setPins] = useState<PinImg[]>([
    { prompt: buildPinPrompt(category, 0), enabled: true, titleOverlay: false, url: null, layout: 'collage4' },
    { prompt: buildPinPrompt(category, 1), enabled: true, titleOverlay: false, url: null, layout: 'hero3panel' },
    { prompt: buildPinPrompt(category, 2), enabled: true, titleOverlay: false, url: null, layout: 'complete' },
  ]);

  const [genFeatured, setGenFeatured] = useState(false);
  const [genSections, setGenSections] = useState(false);
  const [genPins, setGenPins] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [uploadingSectionIdx, setUploadingSectionIdx] = useState<number | null>(null);
  const [uploadingFeatured, setUploadingFeatured] = useState(false);
  const [error, setError] = useState('');

  // Restore from localStorage + build section prompts from outline
  useEffect(() => {
    const saved = localStorage.getItem(`images-${id}`);
    if (saved) {
      try {
        const store: ImageStore = JSON.parse(saved);
        setFeatured(store.featured);
        setSections(store.sections);
        setPins(store.pins);
        return;
      } catch { /* corrupt — rebuild */ }
    }

    const outlineRaw = localStorage.getItem(`outline-${id}`);
    if (outlineRaw) {
      try {
        const outline: { headings: Heading[] } = JSON.parse(outlineRaw);
        const allHeadings = outline.headings.filter(h => h.level === 'H2' || h.level === 'H3');
        const built: SectionImg[] = allHeadings.map((h, i) => ({
          headingText: h.text,
          prompt: buildSectionPrompt(h.text, category, i),
          enabled: true,
          url: null,
          level: h.level as 'H2' | 'H3',
        }));
        setSections(built);

        // Auto-improve prompts using article content on first load
        const articleMarkdown = localStorage.getItem(`article-${id}`) ?? '';
        if (articleMarkdown && built.length > 0) {
          setGeneratingPrompts(true);
          const headings = built.map(s => s.headingText);
          fetch('/api/generate-image-prompts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ articleTitle, category, headings, articleMarkdown, includePins: true }),
          })
            .then(r => r.json())
            .then(data => {
              const improved = data.sectionPrompts
                ? built.map((s, i) => ({ ...s, prompt: data.sectionPrompts[i] ?? s.prompt }))
                : built;
              setSections(improved);
              const defaultPins: PinImg[] = [
                { prompt: buildPinPrompt(category, 0), enabled: true, titleOverlay: false, url: null, layout: 'collage4' },
                { prompt: buildPinPrompt(category, 1), enabled: true, titleOverlay: false, url: null, layout: 'hero3panel' },
                { prompt: buildPinPrompt(category, 2), enabled: true, titleOverlay: false, url: null, layout: 'complete' },
              ];
              const improvedPins = data.pinPrompts?.length
                ? defaultPins.map((p, i) => ({ ...p, prompt: data.pinPrompts[i]?.prompt ?? p.prompt, layout: (data.pinPrompts[i]?.layout ?? p.layout) as PinImg['layout'] }))
                : defaultPins;
              setPins(improvedPins);
              localStorage.setItem(`images-${id}`, JSON.stringify({
                featured: { prompt: buildFeaturedPrompt(category), url: null },
                sections: improved,
                pins: improvedPins,
              }));
            })
            .catch(() => {})
            .finally(() => setGeneratingPrompts(false));
        }
      } catch { /* ignore */ }
    }
  }, [id, category]);

  // Each function reads current localStorage first so sequential calls don't clobber each other
  const persistFeatured = (newF: FeaturedImg) => {
    const raw = localStorage.getItem(`images-${id}`);
    const existing: ImageStore = raw ? JSON.parse(raw) : { featured, sections, pins };
    localStorage.setItem(`images-${id}`, JSON.stringify({ ...existing, featured: newF }));
  };
  const persistSections = (newSec: SectionImg[]) => {
    const raw = localStorage.getItem(`images-${id}`);
    const existing: ImageStore = raw ? JSON.parse(raw) : { featured, sections, pins };
    localStorage.setItem(`images-${id}`, JSON.stringify({ ...existing, sections: newSec }));
  };
  const persistPins = (newPins: PinImg[]) => {
    const raw = localStorage.getItem(`images-${id}`);
    const existing: ImageStore = raw ? JSON.parse(raw) : { featured, sections, pins };
    localStorage.setItem(`images-${id}`, JSON.stringify({ ...existing, pins: newPins }));
  };

  // ── upload helpers ────────────────────────────────────────────────────────

  const uploadFile = async (file: File): Promise<string> => {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch('/api/upload-image', { method: 'POST', body: form });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? 'Upload failed');
    return data.url as string;
  };

  const uploadFeaturedImage = async (file: File) => {
    setUploadingFeatured(true); setError('');
    try {
      const url = await uploadFile(file);
      const newF = { ...featured, url };
      setFeatured(newF);
      persistFeatured(newF);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Upload failed'); }
    finally { setUploadingFeatured(false); }
  };

  const uploadSectionImage = async (idx: number, file: File) => {
    setUploadingSectionIdx(idx); setError('');
    try {
      const url = await uploadFile(file);
      const newSec = sections.map((s, j) => j === idx ? { ...s, url, enabled: true } : s);
      setSections(newSec);
      persistSections(newSec);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Upload failed'); }
    finally { setUploadingSectionIdx(null); }
  };

  // ── generate helpers ──────────────────────────────────────────────────────

  const callGenerate = async (prompts: Array<{ prompt: string; model: 'dev' | 'schnell'; label: string; width?: number; height?: number }>) => {
    const res = await fetch('/api/generate-images', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompts }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? 'Generation failed');
    return data.images as Array<{ url: string; label: string }>;
  };

  const generateFeatured = async () => {
    setGenFeatured(true); setError('');
    try {
      const imgs = await callGenerate([{ prompt: featured.prompt, model: 'dev', label: 'featured', width: 1200, height: 800 }]);
      const newF = { ...featured, url: imgs[0].url };
      setFeatured(newF);
      persistFeatured(newF);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Failed'); }
    finally { setGenFeatured(false); }
  };

  const improvePrompts = async () => {
    const enabledSecs = sections.filter(s => s.enabled);
    const headings = enabledSecs.map(s => (s.level === 'H3' ? `  ↳ ${s.headingText}` : s.headingText));
    if (!headings.length) return;
    setGeneratingPrompts(true); setError('');
    try {
      const articleMarkdown = localStorage.getItem(`article-${id}`) ?? '';
      const res = await fetch('/api/generate-image-prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleTitle, category, headings, articleMarkdown, includePins: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed');
      if (data.sectionPrompts) {
        const promptMap = Object.fromEntries(
          headings.map((h, i) => [h, data.sectionPrompts[i] ?? ''])
        );
        const newSec = sections.map(s => ({ ...s, prompt: promptMap[s.headingText] ?? s.prompt }));
        setSections(newSec);
        persistSections(newSec);
      }
      if (data.pinPrompts?.length) {
        const newPins = pins.map((p, i) => ({
          ...p,
          prompt: data.pinPrompts[i]?.prompt ?? p.prompt,
          layout: (data.pinPrompts[i]?.layout ?? p.layout) as PinImg['layout'],
        }));
        setPins(newPins);
        persistPins(newPins);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Prompt generation failed');
    } finally {
      setGeneratingPrompts(false);
    }
  };

  const generateSections = async () => {
    setGenSections(true); setError('');
    try {
      const enabled = sections.filter(s => s.enabled);
      if (!enabled.length) { setGenSections(false); return; }
      const prompts = enabled.map(s => ({ prompt: s.prompt, model: 'schnell' as const, label: s.headingText, width: 1000, height: 1500 }));
      const imgs = await callGenerate(prompts);
      const urlMap = Object.fromEntries(imgs.map(img => [img.label, img.url]));
      const newSec = sections.map(s => s.enabled && urlMap[s.headingText] ? { ...s, url: urlMap[s.headingText] } : s);
      setSections(newSec);
      persistSections(newSec);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Failed'); }
    finally { setGenSections(false); }
  };

  const generatePins = async () => {
    setGenPins(true); setError('');
    try {
      const enabled = pins.map((p, i) => ({ ...p, idx: i })).filter(p => p.enabled);
      if (!enabled.length) { setGenPins(false); return; }
      const prompts = enabled.map(p => ({ prompt: p.prompt, model: 'dev' as const, label: String(p.idx), width: 1000, height: 1500 }));
      const imgs = await callGenerate(prompts);
      const urlMap = Object.fromEntries(imgs.map(img => [img.label, img.url]));
      const newPins = pins.map((p, i) => urlMap[String(i)] ? { ...p, url: urlMap[String(i)] } : p);
      setPins(newPins);
      persistPins(newPins);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Failed'); }
    finally { setGenPins(false); }
  };

  const generateAll = async () => {
    setError('');
    await generateFeatured();
    await generateSections();
    await generatePins();
  };

  const resetAndRebuild = () => {
    if (!confirm('Clear all saved images and prompts for this article and rebuild from outline?')) return;
    localStorage.removeItem(`images-${id}`);
    window.location.reload();
  };

  // ── download handlers ────────────────────────────────────────────────────

  const handleDownload = async (url: string, label: string, withOverlay = false) => {
    const key = label;
    setDownloading(key);
    try {
      const filename = `wabi-${id}-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.jpg`;
      if (withOverlay && articleTitle) {
        const pin = label.startsWith('pin-') ? pins[parseInt(label.split('-')[1]) - 1] : null;
        const textPos = pin?.layout === 'complete' ? 'bottom' : 'center';
        await downloadPinWithOverlay(url, articleTitle, filename, textPos);
      } else {
        await downloadImage(url, filename);
      }
    } catch { setError('Download failed — try again'); }
    finally { setDownloading(null); }
  };

  // ── cost calc ─────────────────────────────────────────────────────────────

  const enabledSections = sections.filter(s => s.enabled).length;
  const enabledPins = pins.filter(p => p.enabled).length;
  const devCost = ((enabledPins + 1) * 0.025).toFixed(3);
  const schnellCost = (enabledSections * 0.003).toFixed(3);
  const totalCost = ((enabledPins + 1) * 0.025 + enabledSections * 0.003).toFixed(3);

  const anyGenerating = genFeatured || genSections || genPins;

  return (
    <>
      <StageBar articleId={id} currentStage="images" articleTitle={article?.title} isProduct={isProduct} />
      <div className="wsbody">

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.09em', color: 'var(--t3)', marginBottom: 4 }}>
              Stage 3 — Image Studio
            </div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 400 }}>
              {article?.title ?? 'Article'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 3 }}>
              {enabledSections} section images · {enabledPins} pins · 1 featured · est. <strong>${totalCost}</strong>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <Link href={`/article/${id}/write`} className="btn btn-out btn-sm">← Write</Link>
            <button className="btn btn-out btn-sm" onClick={resetAndRebuild} title="Clear saved state and rebuild all sections from outline">↺ Reset</button>
            <button className="btn btn-amber" onClick={generateAll} disabled={anyGenerating}>
              {anyGenerating ? '⟳ Generating…' : '⚡ Generate all'}
            </button>
            <Link href={`/article/${id}/compose`} className="btn btn-sage">Compose layout →</Link>
          </div>
        </div>

        {error && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 'var(--r)', padding: '10px 14px', color: '#991B1B', fontSize: 13, marginBottom: 14 }}>
            ✕ {error}
          </div>
        )}

        {/* ── FEATURED IMAGE ────────────────────────────────────────────── */}
        <div className="img-card" style={{ marginBottom: 14 }}>
          <div className="img-card-hd">
            <div className="img-card-title">Featured Image <span className="img-tag">1200×800 landscape · FLUX Dev</span></div>
            <div style={{ display: 'flex', gap: 6 }}>
              <label className="btn btn-out btn-sm" style={{ cursor: 'pointer' }}>
                {uploadingFeatured ? '⟳ Uploading…' : '↑ Upload'}
                <input type="file" accept="image/*" style={{ display: 'none' }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) uploadFeaturedImage(f); e.target.value = ''; }}
                  disabled={uploadingFeatured}
                />
              </label>
              <button className="btn btn-out btn-sm" onClick={generateFeatured} disabled={genFeatured || uploadingFeatured}>
                {genFeatured ? '⟳' : '⚡'} Generate
              </button>
            </div>
          </div>
          <div style={{ padding: '10px 14px' }}>
            <textarea
              className="prompt-ta"
              value={featured.prompt}
              onChange={e => setFeatured(f => ({ ...f, prompt: e.target.value }))}
            />
            {featured.url && (
              <div className="gen-preview">
                <div className="gen-thumb" style={{ aspectRatio: '3/2' }}>
                  <img src={featured.url} alt="Featured" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'var(--r)' }} />
                </div>
                <button
                  className="dl-btn"
                  onClick={() => handleDownload(featured.url!, 'featured')}
                  disabled={downloading === 'featured'}
                >
                  {downloading === 'featured' ? '⟳' : '↓'} Download
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── SECTION IMAGES ────────────────────────────────────────────── */}
        <div className="img-card" style={{ marginBottom: 14 }}>
          <div className="img-card-hd">
            <div className="img-card-title">
              Section Images <span className="img-tag">1000×1500 portrait · FLUX Schnell · {enabledSections} enabled</span>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn btn-out btn-sm" onClick={improvePrompts} disabled={generatingPrompts || sections.length === 0} title="Claude rewrites all prompts as detailed scene descriptions">
                {generatingPrompts ? '⟳ Writing prompts…' : '✦ Improve prompts'}
              </button>
              <button className="btn btn-out btn-sm" onClick={generateSections} disabled={genSections}>
                {genSections ? '⟳' : '⚡'} Generate
              </button>
            </div>
          </div>
          <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {sections.length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--t3)', fontStyle: 'italic', padding: '8px 0' }}>
                No outline loaded — go back to Outline stage to generate headings first.
              </div>
            )}
            {sections.map((s, i) => (
              <div key={i} className="sec-row" style={{ opacity: s.enabled ? 1 : 0.45 }}>
                <div className="sec-row-top">
                  <input
                    type="checkbox"
                    checked={s.enabled}
                    onChange={e => {
                      const next = sections.map((ss, j) => j === i ? { ...ss, enabled: e.target.checked } : ss);
                      setSections(next); persistSections(next);
                    }}
                    style={{ marginRight: 8, flexShrink: 0 }}
                  />
                  <span style={{ fontSize: 12, fontWeight: s.level === 'H3' ? 400 : 600, flex: 1, color: s.level === 'H3' ? 'var(--t2)' : 'var(--t1)', paddingLeft: s.level === 'H3' ? 12 : 0 }}>
                    {s.level === 'H3' ? '↳ ' : ''}{s.headingText}
                  </span>
                  <label className="dl-btn dl-btn--sm" style={{ cursor: uploadingSectionIdx === i ? 'not-allowed' : 'pointer', opacity: uploadingSectionIdx === i ? 0.5 : 1 }}>
                    {uploadingSectionIdx === i ? '⟳' : '↑'} Upload
                    <input type="file" accept="image/*" style={{ display: 'none' }}
                      onChange={e => { const f = e.target.files?.[0]; if (f) uploadSectionImage(i, f); e.target.value = ''; }}
                      disabled={uploadingSectionIdx === i}
                    />
                  </label>
                  {s.url && (
                    <button
                      className="dl-btn dl-btn--sm"
                      onClick={() => handleDownload(s.url!, `section-${i + 1}`)}
                      disabled={downloading === `section-${i + 1}`}
                    >
                      {downloading === `section-${i + 1}` ? '⟳' : '↓'} Download
                    </button>
                  )}
                </div>
                <textarea
                  className="prompt-ta"
                  style={{ marginTop: 6 }}
                  value={s.prompt}
                  onChange={e => {
                    const next = sections.map((ss, j) => j === i ? { ...ss, prompt: e.target.value } : ss);
                    setSections(next); persistSections(next);
                  }}
                  disabled={!s.enabled}
                />
                {s.url && (
                  <div className="gen-thumb-sm">
                    <img src={s.url} alt={s.headingText} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 4 }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── PINTEREST PINS ────────────────────────────────────────────── */}
        <div className="img-card" style={{ marginBottom: 14 }}>
          <div className="img-card-hd" style={{ borderColor: 'var(--pin)' }}>
            <div className="img-card-title" style={{ color: 'var(--pin)' }}>
              📌 Pinterest Pins <span className="img-tag" style={{ color: 'var(--pin)' }}>1000×1500 portrait · FLUX Dev · {enabledPins} enabled</span>
            </div>
            <button className="btn btn-out btn-sm" style={{ borderColor: 'var(--pin)', color: 'var(--pin)' }} onClick={generatePins} disabled={genPins}>
              {genPins ? '⟳' : '⚡'} Generate pins
            </button>
          </div>
          <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {pins.map((p, i) => (
              <div key={i} className="sec-row" style={{ opacity: p.enabled ? 1 : 0.45 }}>
                <div className="sec-row-top">
                  <input
                    type="checkbox"
                    checked={p.enabled}
                    onChange={e => {
                      const next = pins.map((pp, j) => j === i ? { ...pp, enabled: e.target.checked } : pp);
                      setPins(next); persistPins(next);
                    }}
                    style={{ marginRight: 8, flexShrink: 0 }}
                  />
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--pin)' }}>
                    Pin {i + 1} · <span style={{ fontWeight: 400, fontSize: 10 }}>
                      {p.layout === 'collage4' ? '4-panel collage' : p.layout === 'hero3panel' ? 'hero + 2 panels' : 'complete scene'}
                    </span>
                  </span>

                  {/* Title overlay toggle */}
                  <label className="overlay-toggle" style={{ marginLeft: 'auto' }}>
                    <input
                      type="checkbox"
                      checked={p.titleOverlay}
                      onChange={e => {
                        const next = pins.map((pp, j) => j === i ? { ...pp, titleOverlay: e.target.checked } : pp);
                        setPins(next); persistPins(next);
                      }}
                    />
                    <span>Add title text to image</span>
                  </label>

                  {p.url && (
                    <button
                      className="dl-btn dl-btn--pin"
                      onClick={() => handleDownload(p.url!, `pin-${i + 1}`, p.titleOverlay)}
                      disabled={downloading === `pin-${i + 1}`}
                    >
                      {downloading === `pin-${i + 1}` ? '⟳' : '↓'} {p.titleOverlay ? 'Download with title' : 'Download'}
                    </button>
                  )}
                </div>
                <textarea
                  className="prompt-ta"
                  style={{ marginTop: 6 }}
                  value={p.prompt}
                  onChange={e => {
                    const next = pins.map((pp, j) => j === i ? { ...pp, prompt: e.target.value } : pp);
                    setPins(next); persistPins(next);
                  }}
                  disabled={!p.enabled}
                />
                {p.url && (
                  <div style={{ marginTop: 8, position: 'relative', display: 'inline-block' }}>
                    <div className="gen-thumb-sm" style={{ aspectRatio: '2/3' }}>
                      <img src={p.url} alt={`Pin ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 4 }} />
                    </div>
                    {p.titleOverlay && (
                      <div className="pin-overlay-preview">
                        <div className="pin-overlay-text">{articleTitle}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Cost summary */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ fontSize: 12, color: 'var(--t2)' }}>
            1 featured (Dev ${(0.025).toFixed(3)}) + {enabledSections} sections (Schnell ${schnellCost}) + {enabledPins} pins (Dev ${((enabledPins) * 0.025).toFixed(3)}) = <strong>${totalCost}</strong>
          </div>
          <button className="btn btn-dark" onClick={generateAll} disabled={anyGenerating}>
            ⚡ {anyGenerating ? 'Generating…' : 'Generate all'}
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Link href={`/article/${id}/compose`} className="btn btn-sage">Images done — arrange layout →</Link>
        </div>

      </div>

      <style>{`
        .img-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--r);
          overflow: hidden;
        }
        .img-card-hd {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 14px;
          border-bottom: 1px solid var(--border);
          background: var(--sbg);
        }
        .img-card-title {
          font-size: 13px;
          font-weight: 700;
          color: var(--t1);
        }
        .img-tag {
          font-size: 10px;
          font-weight: 400;
          color: var(--t3);
          margin-left: 8px;
        }
        .sec-row {
          border: 1px solid var(--border);
          border-radius: var(--r);
          padding: 10px 12px;
          background: var(--surface);
          transition: opacity .15s;
        }
        .sec-row-top {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
        }
        .gen-preview {
          margin-top: 10px;
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }
        .gen-thumb {
          width: 180px;
          border-radius: var(--r);
          overflow: hidden;
          flex-shrink: 0;
        }
        .gen-thumb-sm {
          width: 100px;
          aspect-ratio: 2/3;
          border-radius: 4px;
          overflow: hidden;
          margin-top: 8px;
        }
        .dl-btn {
          padding: 5px 10px;
          font-size: 11px;
          font-family: inherit;
          border: 1px solid var(--border);
          border-radius: var(--r);
          background: white;
          cursor: pointer;
          color: var(--t2);
          transition: background .12s;
          white-space: nowrap;
        }
        .dl-btn:hover { background: var(--sbg); }
        .dl-btn:disabled { opacity: .5; cursor: not-allowed; }
        .dl-btn--sm { font-size: 10px; padding: 3px 8px; }
        .dl-btn--pin { border-color: var(--pin); color: var(--pin); }
        .dl-btn--pin:hover { background: var(--pin-bg); }
        .overlay-toggle {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 11px;
          color: var(--t2);
          cursor: pointer;
        }
        .overlay-toggle input { cursor: pointer; }
        .pin-overlay-preview {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          background: linear-gradient(to bottom, transparent, rgba(0,0,0,0.75));
          padding: 16px 8px 8px;
          border-radius: 0 0 4px 4px;
        }
        .pin-overlay-text {
          font-size: 9px;
          color: rgba(255,255,255,0.9);
          text-align: center;
          font-family: Georgia, serif;
          line-height: 1.3;
        }
        .prompt-ta {
          width: 100%;
          font-size: 11px;
          font-family: inherit;
          line-height: 1.5;
          color: var(--t2);
          border: 1px solid var(--border);
          border-radius: 4px;
          padding: 6px 8px;
          resize: vertical;
          background: white;
          min-height: 54px;
          box-sizing: border-box;
          outline: none;
        }
        .prompt-ta:focus { border-color: var(--sage); }
        .prompt-ta:disabled { background: var(--sbg); cursor: not-allowed; }
      `}</style>
    </>
  );
}
