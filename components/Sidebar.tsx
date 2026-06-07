'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

type SheetArticle = { id: string; title: string; type: string; category: string; status: string; publishedAt?: string };
type PubLink = { label: string; title?: string; category?: string; slug?: string; url?: string };
type PubArticle = {
  _id: string; title: string; category: string; slug: string; publishedAt?: string;
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

function groupByCategory(articles: PubArticle[]): Record<string, PubArticle[]> {
  const groups: Record<string, PubArticle[]> = {};
  for (const a of articles) {
    const cat = a.category ?? 'uncategorised';
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(a);
  }
  return groups;
}

function catLabel(cat: string) {
  return cat.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [tab, setTab] = useState<'workflow' | 'published'>('workflow');

  // Workflow data
  const [articles, setArticles] = useState<SheetArticle[]>([]);

  // Published data
  const [pubArticles, setPubArticles] = useState<PubArticle[]>([]);
  const [pubLoading, setPubLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [openCats, setOpenCats] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch('/api/sheets')
      .then(r => r.json())
      .then(d => { if (d.articles?.length) setArticles(d.articles); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (tab !== 'published' || pubArticles.length > 0) return;
    setPubLoading(true);
    fetch('/api/published-articles')
      .then(r => r.json())
      .then(d => {
        if (d.articles) {
          setPubArticles(d.articles);
          // Open all categories by default
          const cats = new Set(d.articles.map((a: PubArticle) => a.category));
          setOpenCats(cats as Set<string>);
        }
      })
      .catch(() => {})
      .finally(() => setPubLoading(false));
  }, [tab]);

  const inProgress = articles.filter(a => ['writing', 'images', 'pinterest'].includes(a.status));
  const needsReview = articles.filter(a => a.status === 'outline-ready');
  const queued = articles.filter(a => a.status === 'queue' || a.status === 'queued');

  const toggleCat = (cat: string) => setOpenCats(s => {
    const n = new Set(s);
    n.has(cat) ? n.delete(cat) : n.add(cat);
    return n;
  });

  const groups = groupByCategory(pubArticles);

  return (
    <nav className="sb">
      <div className="sb-brand">
        <div className="sb-logo">wabi-decore.</div>
        <div className="sb-tag">Content Studio</div>
      </div>

      {/* Tabs */}
      <div className="sb-tabs">
        <button className={`sb-tab ${tab === 'workflow' ? 'on' : ''}`} onClick={() => setTab('workflow')}>Workflow</button>
        <button className={`sb-tab ${tab === 'published' ? 'on' : ''}`} onClick={() => setTab('published')}>Published</button>
      </div>

      {/* ── WORKFLOW TAB ── */}
      {tab === 'workflow' && (
        <div className="sb-scroll">
          {inProgress.length > 0 && (
            <>
              <div className="sb-g">Now</div>
              {inProgress.map(art => (
                <Link key={art.id} href={`/article/${art.id}/${getStage(art)}`}
                  className={`sb-item ${pathname.includes(`/article/${art.id}/`) ? 'active' : ''}`}>
                  <div className="dot dg" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="sb-name">{art.title}</div>
                    <div className="sb-meta">{art.status === 'writing' ? 'Writing…' : art.status === 'images' ? 'Images…' : 'Pinterest…'}</div>
                  </div>
                </Link>
              ))}
              <div className="sb-div" />
            </>
          )}

          {needsReview.length > 0 && (
            <>
              <div className="sb-g">Needs Review ({needsReview.length})</div>
              {needsReview.map(art => (
                <Link key={art.id} href={`/article/${art.id}/${getStage(art)}`}
                  className={`sb-item ${pathname.includes(`/article/${art.id}/`) ? 'active' : ''}`}>
                  <div className="dot dr" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="sb-name">{art.title}</div>
                    <div className="sb-meta">{art.type === 'product-review' ? 'Product Review' : art.type === 'roundup' ? 'Roundup' : 'Editorial'}</div>
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
            <Link href="/" style={{ padding: '8px 18px', fontSize: 11, color: '#3A3835', cursor: 'pointer', display: 'block', textDecoration: 'none' }}>
              + {queued.length - 5} more in queue →
            </Link>
          )}
        </div>
      )}

      {/* ── PUBLISHED TAB ── */}
      {tab === 'published' && (
        <div className="sb-scroll">
          {pubLoading && <div style={{ padding: '20px 18px', fontSize: 12, color: 'var(--t3)' }}>Loading…</div>}
          {!pubLoading && pubArticles.length === 0 && (
            <div style={{ padding: '20px 18px', fontSize: 12, color: 'var(--t3)' }}>No published articles found.</div>
          )}
          {Object.entries(groups).map(([cat, arts]) => (
            <div key={cat}>
              <button className="sb-cat-hd" onClick={() => toggleCat(cat)}>
                <span>{openCats.has(cat) ? '▾' : '▸'}</span>
                <span>{catLabel(cat)}</span>
                <span className="sb-cat-count">{arts.length}</span>
              </button>

              {openCats.has(cat) && arts.map(art => (
                <div key={art._id} className="pub-item">
                  {/* Article row */}
                  <button
                    className="pub-item-row"
                    onClick={() => setExpandedId(expandedId === art._id ? null : art._id)}
                  >
                    <div className="dot dp" style={{ flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="sb-name">{art.title}</div>
                      <div className="sb-meta" style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                        {art.internalCount > 0 && <span>🔗 {art.internalCount} internal</span>}
                        {art.externalCount > 0 && <span>↗ {art.externalCount} external</span>}
                        {art.internalCount === 0 && art.externalCount === 0 && <span>No links</span>}
                      </div>
                    </div>
                    <span style={{ fontSize: 10, color: 'var(--t3)', flexShrink: 0 }}>{expandedId === art._id ? '▴' : '▾'}</span>
                  </button>

                  {/* Expanded details */}
                  {expandedId === art._id && (
                    <div className="pub-item-detail">
                      {/* Action buttons */}
                      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                        <button className="pub-action-btn" onClick={() => router.push(`/edit/${art._id}/images`)}>+ Add images</button>
                        <button className="pub-action-btn" onClick={() => router.push(`/edit/${art._id}`)}>✎ Edit text</button>
                        <a href={`https://wabidecor.com/${art.category}/${art.slug}`} target="_blank" rel="noopener" className="pub-action-btn">↗ Live</a>
                      </div>

                      {/* Internal links */}
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

                      {/* External links */}
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
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      <Link href="/article/new/brief" className="sb-new">+ New product review / roundup</Link>

      <style>{`
        .sb-tabs { display: flex; border-bottom: 1px solid var(--border); margin: 0; }
        .sb-tab { flex: 1; padding: 8px 0; font-size: 11px; font-weight: 600; font-family: inherit; background: none; border: none; cursor: pointer; color: var(--t3); transition: color .12s; }
        .sb-tab.on { color: var(--t1); border-bottom: 2px solid var(--t1); margin-bottom: -1px; }
        .sb-tab:hover { color: var(--t2); }

        .sb-cat-hd { width: 100%; display: flex; align-items: center; gap: 6px; padding: 8px 18px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: var(--t3); background: none; border: none; cursor: pointer; text-align: left; font-family: inherit; }
        .sb-cat-hd:hover { color: var(--t2); }
        .sb-cat-count { margin-left: auto; background: var(--border); color: var(--t3); font-size: 9px; padding: 1px 5px; border-radius: 8px; }

        .pub-item { border-bottom: 1px solid var(--border); }
        .pub-item-row { width: 100%; display: flex; align-items: flex-start; gap: 8px; padding: 8px 18px; background: none; border: none; cursor: pointer; text-align: left; font-family: inherit; }
        .pub-item-row:hover { background: var(--sbg); }

        .pub-item-detail { padding: 8px 18px 12px; background: var(--sbg); border-top: 1px solid var(--border); }
        .pub-action-btn { padding: 4px 8px; font-size: 10px; font-weight: 600; font-family: inherit; border: 1px solid var(--border); border-radius: 4px; background: white; cursor: pointer; color: var(--t2); text-decoration: none; display: inline-block; transition: background .1s; }
        .pub-action-btn:hover { background: var(--surface); }

        .pub-links-section { margin-top: 8px; }
        .pub-links-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: var(--t3); margin-bottom: 4px; }
        .pub-link-row { display: flex; align-items: baseline; gap: 5px; margin-bottom: 3px; }
        .pub-link-icon { font-size: 10px; color: var(--t3); flex-shrink: 0; }
        .pub-link-text { font-size: 11px; color: var(--t2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 160px; }
        .pub-link-ext { color: var(--sage); text-decoration: none; }
        .pub-link-ext:hover { text-decoration: underline; }
      `}</style>
    </nav>
  );
}
