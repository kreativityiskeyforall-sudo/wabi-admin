'use client';

import { useState } from 'react';
import Link from 'next/link';
import StageBar from '@/components/StageBar';
import { MOCK_BOARDS, PINTEREST_TEMPLATES } from '@/lib/mock-data';
import type { SheetArticle } from '@/lib/sheets';

const PIN_COLORS = ['#C8B89A', '#9BAA8E', '#D9C9B0', '#B0C9B8'];
const PIN_COLORS2 = ['#8A7A60', '#7A9580', '#A8957A', '#6A8060'];

export default function PinterestClient({ id, article }: { id: string; article: SheetArticle | null }) {
  const isProduct = article?.type === 'product-review';

  const selectedPins = ['hero', '4grid', 'steps'].map(tid => PINTEREST_TEMPLATES.find(t => t.id === tid)!).filter(Boolean);

  const today = new Date();
  const dates = selectedPins.map((_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() + i * 7);
    return d.toISOString().slice(0, 16);
  });

  const [pinDates, setPinDates] = useState(dates);
  const [scheduled, setScheduled] = useState(false);

  const autoSpace = () => {
    const newDates = selectedPins.map((_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() + i * 7);
      return d.toISOString().slice(0, 16);
    });
    setPinDates(newDates);
  };

  const scheduleAll = async () => {
    await new Promise(r => setTimeout(r, 1000));
    setScheduled(true);
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ' · ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };

  const categorySlug = article?.category?.toLowerCase().replace(/ /g, '-') ?? 'living-room';
  const articleSlug = article?.slug || article?.title?.toLowerCase().replace(/ /g, '-').replace(/[^a-z0-9-]/g, '') ?? 'article-slug';

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
            <button className="btn btn-pin" onClick={scheduleAll}>Schedule all {selectedPins.length} pins →</button>
          </div>
        </div>

        {scheduled && (
          <div style={{ background: 'var(--sbg)', border: '1px solid #C8D9C0', borderRadius: 'var(--r)', padding: '12px 16px', marginBottom: 18, fontSize: 12, color: 'var(--sage)', fontWeight: 600 }}>
            ✓ {selectedPins.length} pins scheduled on Pinterest! You can see them in your Pinterest scheduler.
          </div>
        )}

        <div style={{ marginBottom: 8, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.09em', color: 'var(--t3)' }}>
          Your {selectedPins.length} pins — edit title, description, board &amp; date for each
        </div>

        <div className="pin-cards" style={{ gridTemplateColumns: `repeat(${selectedPins.length}, 1fr)` }}>
          {selectedPins.map((pin, i) => (
            <div key={pin.id} className="pin-card">
              <div className="pin-card-thumb" style={{ background: `linear-gradient(145deg, ${PIN_COLORS[i]}, ${PIN_COLORS2[i]})` }}>
                <div style={{ position: 'absolute', top: 6, left: 6, background: 'var(--pin)', color: '#fff', fontSize: 8, fontWeight: 700, padding: '2px 5px', borderRadius: 3 }}>📌 {pin.name}</div>
                <div style={{ position: 'absolute', bottom: 8, left: 8, right: 8, fontFamily: "'Playfair Display', serif", fontSize: 11, color: 'white', fontWeight: 400, lineHeight: 1.3, textShadow: '0 1px 3px rgba(0,0,0,.5)' }}>
                  {article?.title}
                </div>
              </div>
              <div className="pin-card-body">
                <div className="pin-field">
                  <span className="lbl">Pin title</span>
                  <input className="pin-input" type="text" defaultValue={`${article?.title ?? 'Article'} — Transform Your Space`} />
                </div>
                <div className="pin-field">
                  <span className="lbl">Description + hashtags</span>
                  <textarea className="pin-ta" defaultValue={`${article?.type === 'product-review' ? 'Full review with price history and verdict.' : 'Save this for your next weekend project!'} #JapandiDecor #MinimalistHome #WabiSabi #JapandiStyle #HomeDecor`} />
                </div>
                <div className="pin-field">
                  <span className="lbl">Destination URL</span>
                  <div className="pin-url">wabidecor.com/{categorySlug}/{articleSlug}</div>
                </div>
                <div className="pin-field">
                  <span className="lbl">Pinterest board</span>
                  <select className="board-sel">
                    {MOCK_BOARDS.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div className="pin-field" style={{ marginBottom: 0 }}>
                  <span className="lbl">Publish date &amp; time</span>
                  <input className="pin-date" type="datetime-local" value={pinDates[i] ?? ''} onChange={e => setPinDates(d => d.map((v, j) => j === i ? e.target.value : v))} />
                </div>
              </div>
            </div>
          ))}
        </div>

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
                    <div className="sched-when">{formatDate(pinDates[i] ?? '')} · Board: {MOCK_BOARDS[0]?.name}</div>
                  </div>
                  <div className={`sched-status ${scheduled ? 'live' : 'sched'}`}>{scheduled ? '✓ Scheduled' : 'Pending'}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '16px 20px', marginTop: 18, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 3 }}>Pinterest account</div>
            <div style={{ fontSize: 11, color: 'var(--t3)' }}>@wabi.decore · {MOCK_BOARDS.length} boards · posting via Pinterest API v5</div>
          </div>
          <button className="btn btn-pin" onClick={scheduleAll}>📌 Schedule all {selectedPins.length} pins</button>
          <Link href={`/article/${id}/publish`} className="btn btn-sage">→ Publish article</Link>
        </div>
      </div>
    </>
  );
}
