'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

type SheetArticle = {
  id: string; title: string; type: string; category: string;
  status: string; publishedAt?: string;
};
type PubLink = { label?: string; title?: string; category?: string; slug?: string; url?: string };
type PubArticle = {
  _id: string; title: string; category: string; slug: string;
  internalCount: number; externalCount: number;
  internalLinks: PubLink[]; externalLinks: PubLink[];
};

function getStage(art: SheetArticle): string {
  if (art.status === 'writing') return 'write';
  if (art.status === 'images') return 'images';
  if (art.status === 'pinterest') return 'pinterest';
  if (art.status === 'outline-ready') {
    if (art.type === 'product-review') return 'brief';
    if (art.type === 'roundup') return 'roundup';
    return 'outline';
  }
  return 'outline';
}

function catLabel(cat: string) {
  return cat.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function groupByCategory<T extends { category: string }>(items: T[]): Record<string, T[]> {
  const g: Record<string, T[]> = {};
  for (const item of items) {
    const c = item.category ?? 'other';
    if (!g[c]) g[c] = [];
    g[c].push(item);
  }
  return g;
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const [tab, setTab] = useState<'queued' | 'published' | 'media'>('queued');

  // Queued data (Google Sheets)
  const [articles, setArticles] = useState<SheetArticle[]>([]);

  // Published data (Sanity)
  const [pubArticles, setPubArticles] = useState<PubArticle[]>([]);
  const [pubLoading, setPubLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [openCats, setOpenCats] = useState<Set<string>>(new Set());
  const [editingSourcesId, setEditingSourcesId] = useState<string | null>(null);
  const [sourceDraft, setSourceDraft] = useState<{ label: string; url: string }[]>([]);
  const [newLabel, setNewLabel] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/sheets')
      .then(r => r.json())
      .then(d => { if (d.articles?.length) setArticles(d.articles); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (tab !== 'published') return;
    setPubLoading(true);
    fetch('/api/published-articles')
      .then(r => r.json())
      .then(d => {
        if (d.articles) {
          setPubArticles(d.articles);
          setOpenCats(new Set(d.articles.map((a: PubArticle) => a.category)));
        }
      })
      .catch(() => {})
      .finally(() => setPubLoading(false));
  }, [tab]);

  const inProgress    = articles.filter(a => ['writing', 'images', 'pinterest'].includes(a.status));
  const needsReview   = articles.filter(a => a.status === 'outline-ready');
  const queued        = articles.filter(a => a.status === 'queue' || a.status === 'queued');
  const publishedInQ  = articles.filter(a => a.status === 'published');
  const allUnpub      = [...inProgress, ...needsReview, ...queued];

  const toggleCat = (cat: string) => setOpenCats(s => {
    const n = new Set(s); n.has(cat) ? n.delete(cat) : n.add(cat); return n;
  });

  const pubGroups = groupByCategory(pubArticles);

  const openSources = (art: PubArticle) => {
    setEditingSourcesId(art._id);
    setSourceDraft((art.externalLinks ?? []).map(l => ({ label: l.label ?? '', url: l.url ?? '' })));
    setNewLabel('');
    setNewUrl('');
  };

  const labelFromUrl = (url: string) => {
    try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
  };

  const handleAddSource = () => {
    const url = newUrl.trim();
    if (!url) return;
    const label = newLabel.trim() || labelFromUrl(url);
    setSourceDraft(d => [...d, { label, url }]);
    setNewLabel('');
    setNewUrl('');
  };

  const handleSaveSources = async (docId: string) => {
    // Auto-add anything still in the inputs before saving
    let finalDraft = sourceDraft;
    const pendingUrl = newUrl.trim();
    if (pendingUrl) {
      const pendingLabel = newLabel.trim() || labelFromUrl(pendingUrl);
      finalDraft = [...sourceDraft, { label: pendingLabel, url: pendingUrl }];
      setSourceDraft(finalDraft);
      setNewLabel('');
      setNewUrl('');
    }

    setSavingId(docId);
    try {
      await fetch('/api/external-links', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ docId, links: finalDraft }),
      });
      setPubArticles(prev => prev.map(a => a._id === docId
        ? { ...a, externalLinks: finalDraft.map(l => ({ label: l.label, url: l.url })), externalCount: finalDraft.length }
        : a
      ));
      setEditingSourcesId(null);
    } finally {
      setSavingId(null);
    }
  };

  return (
    <nav className="sb">
      <div className="sb-brand">
        <div className="sb-logo">wabi-decore.</div>
        <div className="sb-tag">Content Studio</div>
      </div>

      {/* ── 3 TABS ── */}
      <div className="sb-tabs">
        <button className={`sb-tab ${tab === 'queued' ? 'on' : ''}`} onClick={() => setTab('queued')}>
          Queued{allUnpub.length > 0 && <span className="sb-tab-badge">{allUnpub.length}</span>}
        </button>
        <button className={`sb-tab ${tab === 'published' ? 'on' : ''}`} onClick={() => setTab('published')}>
          Published
        </button>
        <button className={`sb-tab ${tab === 'media' ? 'on' : ''}`} onClick={() => setTab('media')}>
          Media
        </button>
      </div>

      {/* ── QUEUED TAB ── */}
      {tab === 'queued' && (
        <div className="sb-scroll">
          {inProgress.length > 0 && (
            <>
              <div className="sb-g">In progress ({inProgress.length})</div>
              {inProgress.map(art => (
                <Link key={art.id} href={`/article/${art.id}/${getStage(art)}`}
                  className={`sb-item ${pathname.includes(`/article/${art.id}/`) ? 'active' : ''}`}>
                  <div className="dot dg" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="sb-name">{art.title}</div>
                    <div className="sb-meta">
                      {art.status === 'writing' ? 'Writing…' : art.status === 'images' ? 'Images…' : 'Pinterest…'}
                    </div>
                  </div>
                </Link>
              ))}
              <div className="sb-div" />
            </>
          )}

          {needsReview.length > 0 && (
            <>
              <div className="sb-g">Needs outline ({needsReview.length})</div>
              {needsReview.map(art => (
                <Link key={art.id} href={`/article/${art.id}/${getStage(art)}`}
                  className={`sb-item ${pathname.includes(`/article/${art.id}/`) ? 'active' : ''}`}>
                  <div className="dot dr" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="sb-name">{art.title}</div>
                    <div className="sb-meta">
                      {art.type === 'product-review' ? 'Product Review' : art.type === 'roundup' ? 'Roundup' : 'Editorial'}
                    </div>
                  </div>
                </Link>
              ))}
              <div className="sb-div" />
            </>
          )}

          <div className="sb-g">Queue ({queued.length})</div>
          {queued.slice(0, 5).map(art => (
            <Link key={art.id} href={`/article/${art.id}/outline`} className="sb-item">
              <div className="dot dq" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="sb-name">{art.title}</div>
                <div className="sb-meta">{art.category} · {art.type}</div>
              </div>
            </Link>
          ))}
          {queued.length > 5 && (
            <Link href="/" style={{ padding: '8px 18px', fontSize: 11, color: 'var(--t3)', display: 'block', textDecoration: 'none' }}>
              + {queued.length - 5} more →
            </Link>
          )}

          {allUnpub.length === 0 && (
            <div style={{ padding: '20px 18px', fontSize: 12, color: 'var(--t3)' }}>
              All articles published!
            </div>
          )}

          {publishedInQ.length > 0 && (
            <>
              <div className="sb-div" />
              <div className="sb-g">Published ({publishedInQ.length})</div>
              {publishedInQ.map(art => (
                <div key={art.id} className="sb-item" style={{ opacity: 0.7 }}>
                  <div className="dot" style={{ background: 'var(--sage)', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="sb-name">{art.title}</div>
                    <div className="sb-meta">{art.category} · <span style={{ color: 'var(--sage)', fontWeight: 600 }}>✓ Published</span></div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* ── PUBLISHED TAB ── */}
      {tab === 'published' && (
        <div className="sb-scroll">
          {pubLoading && <div style={{ padding: '20px 18px', fontSize: 12, color: 'var(--t3)' }}>Loading…</div>}

          {!pubLoading && pubArticles.length === 0 && (
            <div style={{ padding: '20px 18px', fontSize: 12, color: 'var(--t3)' }}>No published articles yet.</div>
          )}

          {Object.entries(pubGroups).map(([cat, arts]) => (
            <div key={cat}>
              <button className="sb-cat-hd" onClick={() => toggleCat(cat)}>
                <span style={{ fontSize: 10 }}>{openCats.has(cat) ? '▾' : '▸'}</span>
                <span>{catLabel(cat)}</span>
                <span className="sb-cat-count">{arts.length}</span>
              </button>

              {openCats.has(cat) && arts.map(art => (
                <div key={art._id} className="pub-item">
                  <button className="pub-item-row" onClick={() => setExpandedId(expandedId === art._id ? null : art._id)}>
                    <div className="dot dp" style={{ flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="sb-name">{art.title}</div>
                      <div className="sb-meta" style={{ display: 'flex', gap: 8, marginTop: 2, flexWrap: 'wrap' }}>
                        {art.internalCount > 0 && <span>🔗 {art.internalCount}</span>}
                        {art.externalCount > 0 && <span>↗ {art.externalCount}</span>}
                        {art.internalCount === 0 && art.externalCount === 0 && <span style={{ color: 'var(--t3)' }}>No links</span>}
                      </div>
                    </div>
                    <span style={{ fontSize: 10, color: 'var(--t3)' }}>{expandedId === art._id ? '▴' : '▾'}</span>
                  </button>

                  {expandedId === art._id && (
                    <div className="pub-item-detail">
                      <div style={{ display: 'flex', gap: 5, marginBottom: 10, flexWrap: 'wrap' }}>
                        <button className="pub-action-btn" onClick={() => router.push(`/edit/${art._id}`)}>✎ Edit</button>
                        <button className="pub-action-btn" onClick={() => router.push(`/edit/${art._id}/images`)}>+ Images</button>
                        <a href={`https://wabidecor.com/${art.category}/${art.slug}`} target="_blank" rel="noopener" className="pub-action-btn">↗ Live</a>
                        <button className="pub-action-btn" onClick={() => openSources(art)}>↗ Sources</button>
                      </div>

                      {editingSourcesId === art._id ? (
                        <div>
                          <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--t3)', marginBottom: 8 }}>External Sources</div>

                          {sourceDraft.length === 0 && (
                            <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 8 }}>No sources yet — add one below.</div>
                          )}

                          {sourceDraft.map((link, i) => (
                            <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'flex-start', marginBottom: 6, background: '#1E1D1B', borderRadius: 4, padding: '6px 8px' }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 11, fontWeight: 600, color: '#FDFAF6', marginBottom: 2 }}>{link.label}</div>
                                <div style={{ fontSize: 10, color: 'var(--t3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{link.url}</div>
                              </div>
                              <button onClick={() => setSourceDraft(d => d.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6A6660', fontSize: 12, padding: '0 2px', lineHeight: 1, flexShrink: 0 }}>✕</button>
                            </div>
                          ))}

                          <div style={{ borderTop: '1px solid #2E2D2A', paddingTop: 8, marginTop: 8, display: 'flex', flexDirection: 'column', gap: 5 }}>
                            <input
                              value={newUrl}
                              onChange={e => setNewUrl(e.target.value)}
                              placeholder="Paste URL here"
                              className="src-input"
                              onKeyDown={e => e.key === 'Enter' && handleAddSource()}
                            />
                            <button className="pub-action-btn" onClick={handleAddSource} disabled={!newUrl.trim()}>+ Add</button>
                          </div>

                          <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                            <button
                              className="pub-action-btn src-save-btn"
                              onClick={() => handleSaveSources(art._id)}
                              disabled={savingId === art._id}
                            >
                              {savingId === art._id ? '⟳ Saving…' : '✓ Save & rebuild'}
                            </button>
                            <button className="pub-action-btn" onClick={() => setEditingSourcesId(null)}>Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {art.internalLinks?.length > 0 && (
                            <div className="pub-links-section">
                              <div className="pub-links-label">Internal links</div>
                              {art.internalLinks.map((l, i) => (
                                <div key={i} className="pub-link-row">
                                  <span className="pub-link-icon">→</span>
                                  <span className="pub-link-text">{l.title ?? l.label ?? 'Unknown'}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {art.externalLinks?.length > 0 && (
                            <div className="pub-links-section">
                              <div className="pub-links-label">External links</div>
                              {art.externalLinks.map((l, i) => (
                                <div key={i} className="pub-link-row">
                                  <span className="pub-link-icon">↗</span>
                                  <a href={l.url} target="_blank" rel="noopener" className="pub-link-text pub-link-ext">
                                    {l.label || l.url}
                                  </a>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* ── MEDIA TAB ── */}
      {tab === 'media' && (
        <div className="sb-scroll">
          <div style={{ padding: '16px 18px' }}>
            <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 14, lineHeight: 1.5 }}>
              Browse and download all generated images organised by article.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Link href="/media?tab=pinterest" className="media-nav-btn">
                <span style={{ fontSize: 16 }}>📌</span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700 }}>Pinterest Pins</div>
                  <div style={{ fontSize: 10, color: 'var(--t3)' }}>3 pins per article · downloadable</div>
                </div>
                <span style={{ marginLeft: 'auto', color: 'var(--t3)', fontSize: 12 }}>→</span>
              </Link>
              <Link href="/media?tab=sections" className="media-nav-btn">
                <span style={{ fontSize: 16 }}>🖼</span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700 }}>Section Images</div>
                  <div style={{ fontSize: 10, color: 'var(--t3)' }}>Portrait article images · downloadable</div>
                </div>
                <span style={{ marginLeft: 'auto', color: 'var(--t3)', fontSize: 12 }}>→</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className="sb-footer">
        <Link href="/seo-agent" className={`sb-footer-btn ${pathname === '/seo-agent' ? 'on' : ''}`}>
          ◈ SEO Agent
        </Link>
        <Link href="/article/new/brief" className="sb-footer-btn">
          + New roundup
        </Link>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .sb-tabs { display: flex; border-bottom: 1px solid #2E2D2A; }
        .sb-tab { flex: 1; padding: 8px 4px; font-size: 10px; font-weight: 600; font-family: inherit; background: none; border: none; cursor: pointer; color: #6A6660; transition: color .12s; position: relative; display: flex; align-items: center; justify-content: center; gap: 4px; }
        .sb-tab.on { color: #FDFAF6; border-bottom: 2px solid #B87355; margin-bottom: -1px; }
        .sb-tab:hover { color: #9A9692; }
        .sb-tab-badge { background: #B87355; color: white; font-size: 8px; padding: 1px 4px; border-radius: 8px; font-weight: 700; }

        .sb-cat-hd { width: 100%; display: flex; align-items: center; gap: 6px; padding: 8px 18px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: #6A6660; background: none; border: none; cursor: pointer; text-align: left; font-family: inherit; }
        .sb-cat-hd:hover { color: #9A9692; }
        .sb-cat-count { margin-left: auto; background: #2E2D2A; color: #6A6660; font-size: 9px; padding: 1px 5px; border-radius: 8px; }

        .pub-item { border-bottom: 1px solid #2E2D2A; }
        .pub-item-row { width: 100%; display: flex; align-items: flex-start; gap: 8px; padding: 8px 18px; background: none; border: none; cursor: pointer; text-align: left; font-family: inherit; }
        .pub-item-row:hover { background: #252421; }
        .pub-item-detail { padding: 8px 18px 12px; background: #252421; border-top: 1px solid #2E2D2A; }
        .pub-action-btn { padding: 4px 8px; font-size: 10px; font-weight: 600; font-family: inherit; border: 1px solid #3A3935; border-radius: 4px; background: #2E2D2A; cursor: pointer; color: #9A9692; text-decoration: none; display: inline-block; }
        .pub-action-btn:hover { background: #333; color: #FDFAF6; }
        .pub-links-section { margin-top: 8px; }
        .pub-links-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: #6A6660; margin-bottom: 4px; }
        .pub-link-row { display: flex; align-items: baseline; gap: 5px; margin-bottom: 3px; }
        .pub-link-icon { font-size: 10px; color: #6A6660; flex-shrink: 0; }
        .pub-link-text { font-size: 11px; color: #9A9692; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 160px; }
        .pub-link-ext { color: #7AB870; text-decoration: none; }
        .pub-link-ext:hover { text-decoration: underline; }

        .src-input { width: 100%; padding: 5px 8px; font-size: 11px; font-family: inherit; background: #1E1D1B; border: 1px solid #3A3935; border-radius: 4px; color: #FDFAF6; outline: none; box-sizing: border-box; }
        .src-input::placeholder { color: #4A4845; }
        .src-input:focus { border-color: #6A6660; }
        .src-save-btn { color: #7AB870 !important; border-color: #3A5238 !important; }
        .src-save-btn:hover { background: #2A3828 !important; }
        .media-nav-btn { display: flex; align-items: center; gap: 10px; padding: 12px 14px; background: #252421; border: 1px solid #2E2D2A; border-radius: var(--r); text-decoration: none; color: #9A9692; transition: background .12s; }
        .media-nav-btn:hover { background: #2E2D2A; color: #FDFAF6; }
        .sb-footer { display: flex; flex-direction: column; border-top: 1px solid #2E2D2A; padding: 8px 0; margin-top: auto; }
        .sb-footer-btn { display: block; padding: 9px 18px; font-size: 11px; font-weight: 600; font-family: inherit; color: #6A6660; text-decoration: none; transition: color .12s, background .12s; }
        .sb-footer-btn:hover { color: #FDFAF6; background: #252421; }
        .sb-footer-btn.on { color: #7AB870; background: #252421; }
      ` }} />
    </nav>
  );
}
