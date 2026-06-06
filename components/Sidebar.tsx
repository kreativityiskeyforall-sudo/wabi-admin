'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MOCK_ARTICLES } from '@/lib/mock-data';

export default function Sidebar() {
  const pathname = usePathname();

  const inProgress = MOCK_ARTICLES.filter(a => a.status === 'writing');
  const needsReview = MOCK_ARTICLES.filter(a => a.status === 'outline-ready');
  const queued = MOCK_ARTICLES.filter(a => a.status === 'queued');
  const published = MOCK_ARTICLES.filter(a => a.status === 'published');

  const isActive = (id: string, stage: string) =>
    pathname === `/article/${id}/${stage}`;

  const getArticleStage = (id: string) => {
    const art = MOCK_ARTICLES.find(a => a.id === id);
    if (!art) return 'outline';
    if (art.status === 'outline-ready') {
      return art.type === 'product-review' ? 'brief' : art.type === 'roundup' ? 'roundup' : 'outline';
    }
    return 'outline';
  };

  return (
    <nav className="sb">
      <div className="sb-brand">
        <div className="sb-logo">wabi-decore.</div>
        <div className="sb-tag">Content Studio</div>
      </div>

      <div className="sb-scroll">
        {/* In progress */}
        {inProgress.length > 0 && (
          <>
            <div className="sb-g">Now</div>
            {inProgress.map(art => (
              <Link
                key={art.id}
                href={`/article/${art.id}/write`}
                className={`sb-item ${pathname.includes(`/article/${art.id}/`) ? 'active' : ''}`}
              >
                <div className="dot dg" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="sb-name">{art.title}</div>
                  <div className="sb-meta">Writing…</div>
                </div>
              </Link>
            ))}
            <div className="sb-div" />
          </>
        )}

        {/* Needs review */}
        {needsReview.length > 0 && (
          <>
            <div className="sb-g">Needs Review ({needsReview.length})</div>
            {needsReview.map(art => (
              <Link
                key={art.id}
                href={`/article/${art.id}/${getArticleStage(art.id)}`}
                className={`sb-item ${pathname.includes(`/article/${art.id}/`) ? 'active' : ''}`}
              >
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

        {/* Queue */}
        <div className="sb-g">Queue ({queued.length})</div>
        {queued.slice(0, 4).map(art => (
          <Link
            key={art.id}
            href="/"
            className="sb-item"
          >
            <div className="dot dq" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="sb-name">{art.title}</div>
              <div className="sb-meta">{art.category} · {art.type}</div>
            </div>
          </Link>
        ))}
        {queued.length > 4 && (
          <Link href="/" style={{ padding: '8px 18px', fontSize: 11, color: '#3A3835', cursor: 'pointer', display: 'block', textDecoration: 'none' }}>
            + {queued.length - 4} more in queue →
          </Link>
        )}

        {/* Published */}
        {published.length > 0 && (
          <>
            <div className="sb-div" />
            <div className="sb-g">Published ({published.length})</div>
            {published.map(art => (
              <div key={art.id} className="sb-item">
                <div className="dot dp" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="sb-name">{art.title}</div>
                  <div className="sb-meta">Live · {art.publishedDate}</div>
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
