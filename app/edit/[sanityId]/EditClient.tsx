'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

type InternalArticle = { title: string; category: string; slug: string };
type Selection = { start: number; end: number; text: string };

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
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <Link href={`/edit/${sanityId}/images`} className="btn btn-out btn-sm">+ Images</Link>
          <Link href={`/edit/${sanityId}/shop`} className="btn btn-out btn-sm">✦ Shop The Look</Link>
          <button className="btn btn-sage" onClick={handleSave} disabled={saving}>
            {saving ? '⟳ Saving…' : saved ? '✓ Saved' : '↑ Save to Sanity'}
          </button>
        </div>
      </div>

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
