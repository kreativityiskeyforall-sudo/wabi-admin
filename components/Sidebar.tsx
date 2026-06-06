'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

type Article = {
  id: string;
  title: string;
  type: string;
  category: string;
  status: string;
  publishedAt?: string;
};

function getStage(art: Article): string {
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

export default function Sidebar() {
  const pathname = usePathname();
  const [articles, setArticles] = useState<Article[]>([]);

  useEffect(() => {
    fetch('/api/sheets')
      .then(r => r.json())
      .then(d => { if (d.articles?.length) setArticles(d.articles); })
      .catch(() => {});
  }, []);

  const inProgress = articles.filter(a => ['writing', 'images', 'pinterest'].includes(a.status));
  const needsReview = articles.filter(a => a.status === 'outline-ready');
  const queued = articles.filter(a => a.status === 'queue' || a.status === 'queued');
  const published = articles.filter(a => a.status === 'published');

  return (
    <nav className="sb">
      <div className="sb-brand">
        <div className="sb-logo">wabi-decore.</div>
        <div className="sb-tag">Content Studio</div>
      </div>

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
                  <div className="sb-meta">
                    {art.type === 'product-review' ? 'Brief ready · Product Review'
                      : art.type === 'roundup' ? 'Brief ready · Roundup'
                      : 'Outline ready · Editorial'}
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
          <Link href="/" style={{ padding: '8px 18px', fontSize: 11, color: '#3A3835', cursor: 'pointer', display: 'block', textDecoration: 'none' }}>
            + {queued.length - 5} more in queue →
          </Link>
        )}

        {published.length > 0 && (
          <>
            <div className="sb-div" />
            <div className="sb-g">Published ({published.length})</div>
            {published.map(art => (
              <div key={art.id} className="sb-item">
                <div className="dot dp" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="sb-name">{art.title}</div>
                  <div className="sb-meta">Live · {art.publishedAt}</div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      <Link href="/article/new/brief" className="sb-new">
        + New product review / roundup
      </Link>
    </nav>
  );
}
