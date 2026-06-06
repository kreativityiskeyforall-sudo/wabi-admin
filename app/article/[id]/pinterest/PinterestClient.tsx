'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import StageBar from '@/components/StageBar';
import { PINTEREST_TEMPLATES } from '@/lib/mock-data';
import type { SheetArticle } from '@/lib/sheets';

const PIN_COLORS = ['#C8B89A', '#9BAA8E', '#D9C9B0', '#B0C9B8'];
const PIN_COLORS2 = ['#8A7A60', '#7A9580', '#A8957A', '#6A8060'];

type Board = { id: string; name: string };
type PinState = { title: string; description: string; boardId: string; date: string; imageUrl: string };

const DEFAULT_TEMPLATES = ['hero', '4grid', 'steps'];

export default function PinterestClient({ id, article }: { id: string; article: SheetArticle | null }) {
  const isProduct = article?.type === 'product-review';
  const selectedPins = DEFAULT_TEMPLATES
    .map(tid => PINTEREST_TEMPLATES.find(t => t.id === tid)!)
    .filter(Boolean);

  const categorySlug = article?.category?.toLowerCase().replace(/ /g, '-') ?? 'living-room';
  const articleSlug = (article?.slug || article?.title?.toLowerCase().replace(/ /g, '-').replace(/[^a-z0-9-]/g, '')) ?? 'article';
  const articleUrl = `https://wabidecor.com/${categorySlug}/${articleSlug}`;

  // Real boards from Pinterest API
  const [boards, setBoards] = useState<Board[]>([]);
  const [boardsError, setBoardsError] = useState('');

  // Generated image URLs from previous stage (saved in sessionStorage by ImagesClient)
  const [imageUrls, setImageUrls] = useState<string[]>([]);

  // Per-pin editable state
  const [pins, setPins] = useState<PinState[]>(() => {
    const today = new Date();
    return selectedPins.map((_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() + (i + 1) * 7);
      return {
        title: `${article?.title ?? 'Article'} — Japandi Style`,
        description: `${article?.type === 'product-review'
          ? 'Full review with price history and verdict.'
          : 'Discover the best japandi decor ideas for your home.'
        } #JapandiDecor #MinimalistHome #WabiSabi #JapandiStyle #HomeDecor`,
        boardId: '',
        date: d.toISOString().slice(0, 16),
        imageUrl: '',
      };
    });
  });

  const [scheduling, setScheduling] = useState(false);
  const [results, setResults] = useState<Array<{ ok: boolean; pinId?: string; error?: string }>>([]);
  const [done, setDone] = useState(false);

  // Fetch real Pinterest boards
  useEffect(() => {
    fetch('/api/pinterest')
      .then(r => r.json())
      .then(data => {
        if (data.error) { setBoardsError(data.error); return; }
        setBoards(data.boards ?? []);
        // Auto-select first board for all pins
        if (data.boards?.length) {
          setPins(prev => prev.map(p => ({ ...p, boardId: data.boards[0].id })));
        }
      })
      .catch(() => setBoardsError('Could not connect to Pinterest API'));
  }, []);

  // Load generated image URLs from sessionStorage
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(`images-${id}`);
      if (stored) {
        const imgs: Array<{ url: string; label: string }> = JSON.parse(stored);
        const pinImgs = imgs.filter(i => i.label.startsWith('📌')).map(i => i.url);
        setImageUrls(pinImgs);
        setPins(prev => prev.map((p, i) => ({ ...p, imageUrl: pinImgs[i] ?? '' })));
      }
    } catch { /* ignore */ }
  }, [id]);

  const updatePin = (i: number, field: keyof PinState, val: string) => {
    setPins(prev => prev.map((p, j) => j === i ? { ...p, [field]: val } : p));
  };

  const autoSpace = () => {
    const today = new Date();
    setPins(prev => prev.map((p, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() + (i + 1) * 7);
      return { ...p, date: d.toISOString().slice(0, 16) };
    }));
  };

  const scheduleAll = async () => {
    setScheduling(true);
    setResults([]);
    const out: typeof results = [];

    for (const pin of pins) {
      if (!pin.boardId) {
        out.push({ ok: false, error: 'No board selected' });
        continue;
      }
      if (!pin.imageUrl) {
        out.push({ ok: false, error: 'No image URL — generate images first' });
        continue;
      }
      try {
        const res = await fetch('/api/pinterest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            board_id: pin.boardId,
            title: pin.title,
            description: pin.description,
            link: articleUrl,
            image_url: pin.imageUrl,
            publish_at: new Date(pin.date).toISOString(),
          }),
        });
        const data = await res.json();
        if (!res.ok) out.push({ ok: false, error: data.error });
        else out.push({ ok: true, pinId: data.pin?.id });
      } catch (e: unknown) {
        out.push({ ok: false, error: e instanceof Error ? e.message : 'Failed' });
      }
    }

    setResults(out);
    setDone(out.every(r => r.ok));
    setScheduling(false);
  };

  const formatDate = (iso: string) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
      + ' · ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <>
      <StageBar articleId={id} currentStage="pinterest" articleTitle={article?.title} isProduct={isProduct} />
      <div className="wsbody">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 18 }}>📌</span>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.09em', color: 'var(--pin)' }}>Stage 4 — Pinterest Publisher</div>
            </div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 400 }}>
              Schedule pins for: {article?.title ?? 'Article'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Link href={`/article/${id}/images`} className="btn btn-out btn-sm">← Images</Link>
            <button className="btn btn-pin" onClick={scheduleAll} disabled={scheduling}>
              {scheduling ? '⟳ Scheduling…' : `Schedule all ${selectedPins.length} pins →`}
            </button>
          </div>
        </div>

        {/* Boards error */}
        {boardsError && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 'var(--r)', padding: '10px 14px', marginBottom: 14, fontSize: 12, color: '#991B1B' }}>
            Pinterest boards: {boardsError}
            {boardsError.includes('403') && ' — token needs pins:write scope (awaiting trial approval)'}
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div style={{ background: done ? 'var(--sbg)' : '#FEF2F2', border: `1px solid ${done ? '#C8D9C0' : '#FECACA'}`, borderRadius: 'var(--r)', padding: '12px 16px', marginBottom: 18, fontSize: 12 }}>
            {results.map((r, i) => (
              <div key={i} style={{ color: r.ok ? 'var(--sage)' : '#991B1B', fontWeight: 600 }}>
                {r.ok ? `✓ Pin ${i + 1} scheduled — ID: ${r.pinId}` : `✕ Pin ${i + 1}: ${r.error}`}
              </div>
            ))}
          </div>
        )}

        {/* Missing images warning */}
        {imageUrls.length === 0 && (
          <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 'var(--r)', padding: '10px 14px', marginBottom: 14, fontSize: 12, color: '#92400E' }}>
            ⚠ No generated images found. Go back to <Link href={`/article/${id}/images`} style={{ color: '#92400E', fontWeight: 700 }}>Images stage</Link> and generate images first, or paste image URLs below.
          </div>
        )}

        <div style={{ marginBottom: 8, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.09em', color: 'var(--t3)' }}>
          {selectedPins.length} pins — edit title, description, board &amp; date for each
        </div>

        <div className="pin-cards" style={{ gridTemplateColumns: `repeat(${selectedPins.length}, 1fr)` }}>
          {selectedPins.map((pin, i) => (
            <div key={pin.id} className="pin-card">
              <div className="pin-card-thumb" style={{ background: pins[i]?.imageUrl ? 'transparent' : `linear-gradient(145deg, ${PIN_COLORS[i]}, ${PIN_COLORS2[i]})` }}>
                {pins[i]?.imageUrl
                  ? <img src={pins[i].imageUrl} alt={pin.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'var(--r) var(--r) 0 0' }} />
                  : <>
                      <div style={{ position: 'absolute', top: 6, left: 6, background: 'var(--pin)', color: '#fff', fontSize: 8, fontWeight: 700, padding: '2px 5px', borderRadius: 3 }}>📌 {pin.name}</div>
                      <div style={{ position: 'absolute', bottom: 8, left: 8, right: 8, fontFamily: "'Playfair Display', serif", fontSize: 11, color: 'white', fontWeight: 400, lineHeight: 1.3, textShadow: '0 1px 3px rgba(0,0,0,.5)' }}>
                        {article?.title}
                      </div>
                    </>
                }
              </div>
              <div className="pin-card-body">
                <div className="pin-field">
                  <span className="lbl">Pin title</span>
                  <input className="pin-input" type="text" value={pins[i]?.title ?? ''} onChange={e => updatePin(i, 'title', e.target.value)} />
                </div>
                <div className="pin-field">
                  <span className="lbl">Description + hashtags</span>
                  <textarea className="pin-ta" value={pins[i]?.description ?? ''} onChange={e => updatePin(i, 'description', e.target.value)} />
                </div>
                <div className="pin-field">
                  <span className="lbl">Image URL</span>
                  <input className="pin-input" type="url" placeholder="paste fal.ai or CDN URL" value={pins[i]?.imageUrl ?? ''} onChange={e => updatePin(i, 'imageUrl', e.target.value)} style={{ fontSize: 10 }} />
                </div>
                <div className="pin-field">
                  <span className="lbl">Destination URL</span>
                  <div className="pin-url">{articleUrl}</div>
                </div>
                <div className="pin-field">
                  <span className="lbl">Pinterest board</span>
                  <select className="board-sel" value={pins[i]?.boardId ?? ''} onChange={e => updatePin(i, 'boardId', e.target.value)}>
                    {boards.length === 0 && <option value="">Loading boards…</option>}
                    {boards.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div className="pin-field" style={{ marginBottom: 0 }}>
                  <span className="lbl">Publish date &amp; time</span>
                  <input className="pin-date" type="datetime-local" value={pins[i]?.date ?? ''} onChange={e => updatePin(i, 'date', e.target.value)} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Schedule timeline */}
        <div className="schedule-bar">
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>Publishing schedule</span>
            <button className="btn btn-out btn-sm" onClick={autoSpace}>↺ Auto-space weekly</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {selectedPins.map((pin, i) => (
              <div key={pin.id}>
                {i > 0 && <div style={{ width: 2, height: 14, background: 'var(--border)', margin: '0 13px' }} />}
                <div className="sched-row">
                  <div className="sched-pin-thumb" style={{ background: `linear-gradient(145deg, ${PIN_COLORS[i]}, ${PIN_COLORS2[i]})` }} />
                  <div className="sched-info">
                    <div className="sched-pin-name">{pin.name}</div>
                    <div className="sched-when">
                      {formatDate(pins[i]?.date ?? '')} · Board: {boards.find(b => b.id === pins[i]?.boardId)?.name ?? '—'}
                    </div>
                  </div>
                  <div className={`sched-status ${results[i]?.ok ? 'live' : 'sched'}`}>
                    {results[i]?.ok ? '✓ Scheduled' : 'Pending'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '16px 20px', marginTop: 18, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 3 }}>Pinterest account</div>
            <div style={{ fontSize: 11, color: 'var(--t3)' }}>
              @WabiDecore · {boards.length} boards loaded · Pinterest API v5
              {boards.length === 0 && boardsError && ' · ⚠ check token scopes'}
            </div>
          </div>
          <button className="btn btn-pin" onClick={scheduleAll} disabled={scheduling}>
            📌 {scheduling ? 'Scheduling…' : `Schedule all ${selectedPins.length} pins`}
          </button>
          <Link href={`/article/${id}/publish`} className="btn btn-sage">→ Publish article</Link>
        </div>
      </div>
    </>
  );
}
