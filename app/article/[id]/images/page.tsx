'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import StageBar from '@/components/StageBar';
import { getArticle, PINTEREST_TEMPLATES } from '@/lib/mock-data';

const SECTION_IMAGES = [
  '1. Replace metal handles', '2. Low slatted coffee table',
  '3. Linen throws', '5. Floating shelf', '8. Washi pendant light', '12. Natural jute rug',
];

const TEMPLATE_SVGS: Record<string, string> = {
  hero: `<svg width="48" height="72" viewBox="0 0 48 72"><rect width="48" height="72" fill="#C8B89A"/><rect y="46" width="48" height="26" fill="rgba(0,0,0,.55)"/><rect x="5" y="53" width="34" height="4" rx="2" fill="white"/><rect x="5" y="62" width="24" height="3" rx="1.5" fill="rgba(255,255,255,.55)"/></svg>`,
  '4grid': `<svg width="48" height="72" viewBox="0 0 48 72"><rect width="48" height="14" fill="#1C1B18"/><rect x="4" y="4" width="28" height="5" rx="2" fill="white"/><rect x="1" y="15" width="22" height="27" rx="2" fill="#C8B89A"/><rect x="25" y="15" width="22" height="27" rx="2" fill="#9BAA8E"/><rect x="1" y="44" width="22" height="27" rx="2" fill="#B0A090"/><rect x="25" y="44" width="22" height="27" rx="2" fill="#D0C4B0"/></svg>`,
  steps: `<svg width="48" height="72" viewBox="0 0 48 72"><rect width="48" height="72" fill="white"/><rect x="4" y="3" width="32" height="6" rx="2" fill="#1C1B18"/><rect x="1" y="12" width="16" height="17" rx="2" fill="#C8B89A"/><rect x="19" y="15" width="24" height="4" rx="2" fill="#1C1B18"/><rect x="1" y="32" width="16" height="17" rx="2" fill="#9BAA8E"/><rect x="19" y="35" width="24" height="4" rx="2" fill="#1C1B18"/><rect x="1" y="52" width="16" height="17" rx="2" fill="#D0C4B0"/><rect x="19" y="55" width="24" height="4" rx="2" fill="#1C1B18"/></svg>`,
  '3strip': `<svg width="48" height="72" viewBox="0 0 48 72"><rect width="48" height="14" fill="#1C1B18"/><rect x="4" y="4" width="28" height="5" rx="2" fill="white"/><rect x="1" y="16" width="14" height="55" rx="2" fill="#C8B89A"/><rect x="17" y="16" width="14" height="55" rx="2" fill="#9BAA8E"/><rect x="33" y="16" width="14" height="55" rx="2" fill="#B8A898"/></svg>`,
  texttop: `<svg width="48" height="72" viewBox="0 0 48 72"><rect width="48" height="72" fill="white"/><rect x="4" y="6" width="36" height="6" rx="2" fill="#1C1B18"/><rect x="4" y="16" width="28" height="3" rx="2" fill="#C8C1B5"/><rect x="1" y="32" width="46" height="38" rx="2" fill="#C8B89A"/></svg>`,
  split: `<svg width="48" height="72" viewBox="0 0 48 72"><rect width="27" height="72" fill="#C8B89A"/><rect x="27" width="21" height="72" fill="#F2EDE5"/><rect x="31" y="16" width="14" height="5" rx="2" fill="#1C1B18"/><rect x="31" y="25" width="12" height="3" rx="1.5" fill="#A09890"/></svg>`,
  mosaic: `<svg width="48" height="72" viewBox="0 0 48 72"><rect x="1" y="1" width="28" height="33" rx="2" fill="#C8B89A"/><rect x="31" y="1" width="16" height="15" rx="2" fill="#9BAA8E"/><rect x="31" y="18" width="16" height="16" rx="2" fill="#D0C4B0"/><rect x="1" y="36" width="14" height="20" rx="2" fill="#B8A898"/><rect x="17" y="36" width="14" height="20" rx="2" fill="#C8B89A"/><rect x="33" y="36" width="14" height="20" rx="2" fill="#9BAA8E"/><rect y="58" width="48" height="13" fill="#1C1B18"/><rect x="5" y="62" width="28" height="4" rx="2" fill="white"/></svg>`,
  quote: `<svg width="48" height="72" viewBox="0 0 48 72"><rect width="48" height="72" fill="#C8B89A"/><rect width="48" height="72" fill="rgba(0,0,0,.28)"/><rect x="5" y="18" width="38" height="36" rx="4" fill="rgba(255,255,255,.93)"/><rect x="11" y="26" width="26" height="6" rx="2" fill="#1C1B18"/><rect x="11" y="36" width="22" height="3" rx="1.5" fill="#A09890"/></svg>`,
};

export default function ImagesPage() {
  const { id } = useParams<{ id: string }>();
  const article = getArticle(id);
  const isProduct = article?.type === 'product-review' || article?.type === 'roundup';

  const [selectedTemplates, setSelectedTemplates] = useState(new Set(['hero', '4grid', 'steps']));
  const [generated, setGenerated] = useState<Array<{ url: string; label: string }>>([]);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [pinModel, setPinModel] = useState<'dev' | 'schnell'>('dev');
  const [sectionModel, setSectionModel] = useState<'dev' | 'schnell'>('schnell');
  const [pinPrompt, setPinPrompt] = useState('Minimalist japandi living room interior, warm neutral tones, natural wood low-profile coffee table, linen sofa, dried pampas grass in ceramic vase, soft morning light, calm serene atmosphere, interior photography');

  const toggleTemplate = (id: string) => {
    setSelectedTemplates(s => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setError('');
    try {
      const prompts = [
        // Pinterest pins — one per selected template
        ...Array.from(selectedTemplates).map(t => ({
          prompt: pinPrompt,
          model: pinModel,
          label: `📌 Pin (${PINTEREST_TEMPLATES.find(p => p.id === t)?.name ?? t})`,
        })),
        // Featured image
        { prompt: pinPrompt, model: pinModel as 'dev' | 'schnell', label: 'Featured' },
        // Section images
        ...SECTION_IMAGES.map(s => ({ prompt: `${pinPrompt}, ${s}`, model: sectionModel, label: s })),
      ];
      const res = await fetch('/api/generate-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompts }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Generation failed');
      setGenerated(data.images);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const pinCount = selectedTemplates.size;
  const devCost = (pinCount + 1) * 0.025;
  const schnellCost = 6 * 0.003;

  return (
    <>
      <StageBar articleId={id} currentStage="images" articleTitle={article?.title} isProduct={isProduct} />
      <div className="wsbody">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.09em', color: 'var(--t3)', marginBottom: 4 }}>
              Stage 3 — Image Studio · all images at 1000×1500px portrait
            </div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 400 }}>
              {article?.title ?? 'Article'}…
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Link href={`/article/${id}/write`} className="btn btn-out btn-sm">← Write</Link>
            <button className="btn btn-amber" onClick={handleGenerate} disabled={generating}>
              {generating ? '⟳ Generating…' : '⚡ Generate all images'}
            </button>
          </div>
        </div>

        <div style={{ background: 'var(--sbg)', border: '1px solid #C8D9C0', borderRadius: 'var(--r)', padding: '12px 16px', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 16 }}>📌</span>
          <div style={{ fontSize: 12, color: 'var(--sage)', fontWeight: 500 }}>
            All images generated at <strong>1000×1500px portrait (2:3)</strong> — Pinterest-ready. Hover any image on the website to save it to Pinterest.
          </div>
        </div>

        <div className="img-studio">
          {/* LEFT */}
          <div className="sec-panel">
            {/* Pinterest pins */}
            <div className="sec-card" style={{ borderColor: 'var(--pin)' }}>
              <div className="sec-hd" style={{ background: 'var(--pin-bg)' }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>📌</span>
                <div className="sec-title">
                  Pinterest Pins <span style={{ fontSize: 10, color: 'var(--pin)', fontWeight: 600 }}>Tick templates · 3–4 pins recommended</span>
                </div>
              </div>
              <div style={{ padding: '14px 16px' }}>
                <div style={{ fontSize: 11, color: 'var(--t2)', marginBottom: 12 }}>Select which templates to generate. Schedule them 1–2 weeks apart for maximum reach.</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 12 }}>
                  {PINTEREST_TEMPLATES.map(t => (
                    <div
                      key={t.id}
                      onClick={() => toggleTemplate(t.id)}
                      style={{ cursor: 'pointer', textAlign: 'center', padding: '8px 4px', borderRadius: 'var(--r)', border: `1.5px solid ${selectedTemplates.has(t.id) ? 'var(--pin)' : 'var(--border)'}`, background: selectedTemplates.has(t.id) ? 'var(--pin-bg)' : 'transparent', transition: 'all .15s' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }} dangerouslySetInnerHTML={{ __html: TEMPLATE_SVGS[t.id] ?? '' }} />
                      <div style={{ fontSize: 9, fontWeight: 700, color: selectedTemplates.has(t.id) ? 'var(--pin)' : 'var(--t3)' }}>{t.name}</div>
                    </div>
                  ))}
                </div>
                <div className="mdl-row">
                  <span className="mdl-lbl">Model</span>
                  <div className="mdl-tog">
                    <button className={`mdl-btn ${pinModel === 'schnell' ? 'on' : 'off'}`} onClick={() => setPinModel('schnell')}>Schnell · $0.003</button>
                    <button className={`mdl-btn ${pinModel === 'dev' ? 'on' : 'off'}`} onClick={() => setPinModel('dev')}>Dev · $0.025 ★</button>
                  </div>
                </div>
                <textarea className="prompt-ta" style={{ marginTop: 10 }} value={pinPrompt} onChange={e => setPinPrompt(e.target.value)} />
              </div>
            </div>

            {/* Featured image */}
            <div className="sec-card">
              <div className="sec-hd">
                <input type="checkbox" className="sec-cb" defaultChecked />
                <div className="sec-title">Featured Image <span style={{ fontSize: 10, color: 'var(--t3)' }}>· 1000×1500px portrait</span></div>
                <div className="mdl-tog" style={{ width: 180, flexShrink: 0 }}>
                  <button className="mdl-btn off">Schnell $0.003</button>
                  <button className="mdl-btn on">Dev $0.025 ★</button>
                </div>
              </div>
              <div className="sec-body">
                <textarea className="prompt-ta" defaultValue="Bright airy japandi living room, white oak furniture, natural rattan basket, sage green cushions, large window with sheer curtains, warm afternoon light, minimalist decor, editorial interior photography" />
              </div>
            </div>

            {/* Section images */}
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.09em', color: 'var(--t3)', margin: '4px 0 8px' }}>
              Section images — all 1000×1500px portrait · &quot;Pin it&quot; button auto-added on site
            </div>
            {SECTION_IMAGES.map((s, i) => (
              <div key={i} className="sec-card" style={{ marginBottom: 10 }}>
                <div className="sec-hd">
                  <input type="checkbox" className="sec-cb" defaultChecked={i < 4} />
                  <div className="sec-title" style={{ fontSize: 12 }}>{s}</div>
                  <div className="mdl-tog" style={{ width: 170, flexShrink: 0 }}>
                    <button className={`mdl-btn on`} style={{ fontSize: 10, padding: 4 }}>Schnell $0.003</button>
                    <button className={`mdl-btn off`} style={{ fontSize: 10, padding: 4 }}>Dev $0.025</button>
                  </div>
                </div>
              </div>
            ))}

            {/* Cost summary */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 12, color: 'var(--t2)' }}>
                  {pinCount} pins + 1 featured + 6 section images = <strong>{pinCount + 7} total</strong>
                </div>
                <div style={{ fontSize: 10, color: 'var(--t3)', marginTop: 2 }}>
                  Est. cost: {pinCount + 1} × $0.025 (Dev) + 6 × $0.003 (Schnell) = <strong>${(devCost + schnellCost).toFixed(3)}</strong>
                </div>
              </div>
              <button className="btn btn-dark" onClick={handleGenerate} disabled={generating}>
                ⚡ {generating ? 'Generating…' : 'Generate all'}
              </button>
            </div>

            {/* Error */}
            {error && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 'var(--r)', padding: '12px 16px', color: '#991B1B', fontSize: 13, marginTop: 12 }}>
                ✕ {error}
              </div>
            )}

            {/* Generated grid */}
            {generated.length > 0 && (
              <div style={{ marginTop: 22 }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.09em', color: 'var(--t3)', marginBottom: 10 }}>
                  Generated — all portrait 1000×1500 · click to open full size
                </div>
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '14px 16px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10 }}>
                    {generated.map((img, i) => (
                      <a key={i} href={img.url} target="_blank" rel="noopener" style={{ display: 'block', aspectRatio: '2/3', borderRadius: 'var(--r)', overflow: 'hidden', position: 'relative', cursor: 'pointer' }}>
                        <img src={img.url} alt={img.label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '6px 8px', background: 'rgba(0,0,0,.55)', fontSize: 9, fontWeight: 600, color: 'rgba(255,255,255,.9)', borderRadius: '0 0 var(--r) var(--r)' }}>{img.label}</div>
                      </a>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
                  <Link href={`/article/${id}/pinterest`} className="btn btn-pin">Images ready — set up Pinterest →</Link>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: template picker */}
          <div className="pin-panel">
            <div className="pin-hd">
              <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>Pinterest Templates</h3>
              <p style={{ fontSize: 11, color: 'var(--t3)' }}>Tick which layouts to generate</p>
              <div style={{ fontSize: 10, color: 'var(--amber)', fontWeight: 600, marginTop: 4 }}>★ Tick 3–4 for best reach</div>
            </div>
            <div className="tmpl-grid">
              {PINTEREST_TEMPLATES.map(t => (
                <div key={t.id} className={`tmpl ${selectedTemplates.has(t.id) ? 'sel' : ''}`} onClick={() => toggleTemplate(t.id)}>
                  <div className="tmpl-check">✓</div>
                  <div className="tmpl-prev" dangerouslySetInnerHTML={{ __html: TEMPLATE_SVGS[t.id] ?? '' }} />
                  <div className="tmpl-info">
                    <div className="tmpl-name">{t.name}</div>
                    <div className="tmpl-eng">{t.engagement}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', fontSize: 11, color: 'var(--t2)' }}>
              <strong>{pinCount} templates selected</strong> · generates {pinCount} pins
            </div>
            <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--t3)', marginBottom: 8 }}>Section images model</div>
              <div className="mdl-tog">
                <button className={`mdl-btn ${sectionModel === 'schnell' ? 'on' : 'off'}`} onClick={() => setSectionModel('schnell')}>Schnell (fast)<br /><span style={{ fontSize: 9, opacity: .7 }}>$0.003 each</span></button>
                <button className={`mdl-btn ${sectionModel === 'dev' ? 'on' : 'off'}`} onClick={() => setSectionModel('dev')}>Dev (quality)<br /><span style={{ fontSize: 9, opacity: .7 }}>$0.025 each</span></button>
              </div>
            </div>
            <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button className="btn btn-pin" style={{ width: '100%', justifyContent: 'center' }} onClick={handleGenerate}>⚡ Generate pins + all images</button>
              <button className="btn btn-out" style={{ width: '100%', justifyContent: 'center' }} onClick={handleGenerate}>Pins only first</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
