import Link from 'next/link';
import { getArticlesFromSheets, type SheetArticle } from '@/lib/sheets';
import { MOCK_ARTICLES } from '@/lib/mock-data';

const TYPE_COLORS: Record<string, string> = {
  pillar: 'b-pillar', ideas: 'b-ideas', hacks: 'b-hacks', guide: 'b-guide',
  decor: 'b-decor', 'product-review': 'b-product-review', roundup: 'b-roundup',
  editorial: 'b-ideas', product: 'b-product-review',
};
const STATUS_COLORS: Record<string, string> = {
  queue: 'b-queued', queued: 'b-queued', 'outline-ready': 'b-outline-ready',
  writing: 'b-writing', published: 'b-published', images: 'b-outline-ready',
  pinterest: 'b-writing',
};

function getStageLink(art: SheetArticle) {
  if (art.status === 'published') return null;
  if (art.status === 'writing') return `/article/${art.id}/write`;
  if (art.status === 'images') return `/article/${art.id}/images`;
  if (art.status === 'pinterest') return `/article/${art.id}/pinterest`;
  if (art.type === 'product-review') return `/article/${art.id}/brief`;
  if (art.type === 'roundup') return `/article/${art.id}/roundup`;
  return `/article/${art.id}/outline`;
}

export const dynamic = 'force-dynamic';

export default async function OverviewPage() {
  let articles: SheetArticle[] = await getArticlesFromSheets();
  const usingMock = articles.length === 0;

  if (usingMock) {
    articles = MOCK_ARTICLES.map(a => ({
      id: a.id, title: a.title, type: a.type as SheetArticle['type'],
      category: a.category ?? '', cluster: a.cluster ?? '',
      articleType: 'Branch', pinterestTitle: '', contentType: a.type,
      uniqueAngle: '', competition: '', priority: '',
      status: a.status, slug: '', publishedAt: '',
      rowNumber: 0,
    }));
  }

  const total = articles.length;
  const categoryCount = new Set(articles.map(a => a.category)).size;
  const published = articles.filter(a => a.status === 'published').length;
  const inProgress = articles.filter(a => ['writing', 'images', 'pinterest', 'outline-ready'].includes(a.status)).length;
  const nextArticle = articles.find(a => a.status !== 'published');

  return (
    <div className="ws">
      <div className="wsbody">
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 400, marginBottom: 4 }}>
            Content Queue
          </div>
          <div style={{ fontSize: 12, color: 'var(--t3)' }}>
            {total} articles · {categoryCount} categories
            {usingMock && <span style={{ color: 'var(--amber)', marginLeft: 8 }}>· demo data</span>}
          </div>
        </div>

        <div className="stat-grid">
          <div className="stat">
            <span className="lbl">Total in queue</span>
            <div className="stat-val">{total}</div>
            <div className="stat-sub">27 categories · 5-stage pipeline</div>
          </div>
          <div className="stat sage">
            <span className="lbl">Published</span>
            <div className="stat-val">{published}</div>
            <div className="stat-sub">live on decoreixy.com</div>
          </div>
          <div className="stat amber">
            <span className="lbl">In progress</span>
            <div className="stat-val">{inProgress}</div>
            <div className="stat-sub">being written or reviewed</div>
          </div>
          <div className="stat">
            <span className="lbl">Est. cost / article</span>
            <div className="stat-val" style={{ fontSize: 22 }}>$0.19</div>
            <div className="stat-sub">writing + 11 portrait images</div>
          </div>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--amber)', borderRadius: 'var(--r)', padding: '12px 18px', marginBottom: 22, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' as const }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--amber)' }}>Quick start:</span>
          <Link href="/article/2/outline" className="btn btn-out btn-sm">Editorial outline →</Link>
          <Link href="/article/3/brief" className="btn btn-out btn-sm">Product review brief →</Link>
          <Link href="/article/4/roundup" className="btn btn-out btn-sm">Roundup brief →</Link>
        </div>

        <div className="ov-tbl">
          <div className="ov-hd">
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '.08em', color: 'var(--t3)' }}>
              All articles
            </span>
            {nextArticle && (
              <Link href={getStageLink(nextArticle) ?? '/'} className="btn btn-amber btn-sm">▶ Open next article</Link>
            )}
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
              {articles.map(art => {
                const href = getStageLink(art);
                const displayType = art.contentType || art.type;
                return (
                  <tr key={art.id}>
                    <td><input type="checkbox" style={{ accentColor: 'var(--t1)', width: 13, height: 13 }} /></td>
                    <td><div className="t-title">{art.title}</div></td>
                    <td><span className={`badge ${TYPE_COLORS[displayType.toLowerCase()] ?? 'b-ideas'}`}>{displayType}</span></td>
                    <td style={{ fontSize: 12, color: 'var(--t2)' }}>{art.category}</td>
                    <td><span className={`badge ${STATUS_COLORS[art.status] ?? 'b-queued'}`}>{art.status}</span></td>
                    <td>
                      {href ? (
                        <Link href={href} className="btn btn-dark btn-sm">Open →</Link>
                      ) : (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <a href={`https://decoreixy.com/${art.slug}`} target="_blank" rel="noopener" className="btn btn-out btn-sm">↗ Live</a>
                          <Link href={`/edit/by-slug?slug=${encodeURIComponent(art.slug)}`} className="btn btn-dark btn-sm">Edit →</Link>
                        </div>
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
