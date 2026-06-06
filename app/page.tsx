import Link from 'next/link';
import { MOCK_ARTICLES } from '@/lib/mock-data';

const TYPE_COLORS: Record<string, string> = {
  pillar: 'b-pillar', ideas: 'b-ideas', hacks: 'b-hacks', guide: 'b-guide',
  decor: 'b-decor', 'product-review': 'b-product-review', roundup: 'b-roundup',
};
const STATUS_COLORS: Record<string, string> = {
  queued: 'b-queued', 'outline-ready': 'b-outline-ready',
  writing: 'b-writing', published: 'b-published',
};

function getArticleStageLink(art: (typeof MOCK_ARTICLES)[0]) {
  if (art.status === 'published') return null;
  if (art.status === 'writing') return `/article/${art.id}/write`;
  if (art.status === 'outline-ready') {
    if (art.type === 'product-review') return `/article/${art.id}/brief`;
    if (art.type === 'roundup') return `/article/${art.id}/roundup`;
    return `/article/${art.id}/outline`;
  }
  return `/article/${art.id}/outline`;
}

export default function OverviewPage() {
  const total = MOCK_ARTICLES.length;
  const published = MOCK_ARTICLES.filter(a => a.status === 'published').length;
  const needsReview = MOCK_ARTICLES.filter(a => a.status === 'outline-ready').length;

  return (
    <div className="ws">
      {/* No stage bar on overview */}
      <div className="wsbody">
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 400, marginBottom: 4 }}>
            Content Queue
          </div>
          <div style={{ fontSize: 12, color: 'var(--t3)' }}>
            {total} articles · 3 types: Editorial · Product Review · Roundup
          </div>
        </div>

        {/* Stats */}
        <div className="stat-grid">
          <div className="stat">
            <span className="lbl">Total in queue</span>
            <div className="stat-val">{total}</div>
            <div className="stat-sub">4 categories · 5-stage pipeline</div>
          </div>
          <div className="stat sage">
            <span className="lbl">Published</span>
            <div className="stat-val">{published}</div>
            <div className="stat-sub">live on wabidecor.com</div>
          </div>
          <div className="stat amber">
            <span className="lbl">Needs review</span>
            <div className="stat-val">{needsReview}</div>
            <div className="stat-sub">brief or outline ready</div>
          </div>
          <div className="stat">
            <span className="lbl">Est. cost / article</span>
            <div className="stat-val" style={{ fontSize: 22 }}>$0.19</div>
            <div className="stat-sub">writing + 11 portrait images</div>
          </div>
        </div>

        {/* Quick actions */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--amber)', borderRadius: 'var(--r)', padding: '12px 18px', marginBottom: 22, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' as const }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--amber)' }}>Quick start:</span>
          <Link href="/article/2/outline" className="btn btn-out btn-sm">Editorial outline →</Link>
          <Link href="/article/3/brief" className="btn btn-out btn-sm">Product review brief →</Link>
          <Link href="/article/4/roundup" className="btn btn-out btn-sm">Roundup brief →</Link>
          <Link href="/article/1/write" className="btn btn-out btn-sm" style={{ borderColor: 'var(--sage)', color: 'var(--sage)' }}>Writing in progress →</Link>
        </div>

        {/* Articles table */}
        <div className="ov-tbl">
          <div className="ov-hd">
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '.08em', color: 'var(--t3)' }}>All articles</span>
            <Link href="/article/2/outline" className="btn btn-amber btn-sm">▶ Open next article</Link>
          </div>
          <table>
            <thead>
              <tr>
                <th></th>
                <th>Title</th>
                <th>Type</th>
                <th>Category</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {MOCK_ARTICLES.map(art => {
                const href = getArticleStageLink(art);
                return (
                  <tr key={art.id}>
                    <td><input type="checkbox" style={{ accentColor: 'var(--t1)', width: 13, height: 13 }} /></td>
                    <td><div className="t-title">{art.title}</div></td>
                    <td><span className={`badge ${TYPE_COLORS[art.type] ?? ''}`}>{art.type}</span></td>
                    <td style={{ fontSize: 12, color: 'var(--t2)' }}>{art.category}</td>
                    <td><span className={`badge ${STATUS_COLORS[art.status] ?? ''}`}>{art.status}</span></td>
                    <td>
                      {href ? (
                        <Link href={href} className="btn btn-dark btn-sm">Open →</Link>
                      ) : (
                        <button className="btn btn-out btn-sm">↗ View live</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
