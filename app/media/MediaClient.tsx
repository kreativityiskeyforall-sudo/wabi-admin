'use client';

import { useState, useEffect } from 'react';

type MediaArticle = {
  _id: string;
  title: string;
  category: string;
  slug: string;
  sectionImages?: Array<{ url: string; alt: string; _key: string }>;
  pinterestPins?: Array<{ url: string; layout: string }>;
};

function catLabel(cat: string) {
  return cat.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function groupByCategory(articles: MediaArticle[]): Record<string, MediaArticle[]> {
  const g: Record<string, MediaArticle[]> = {};
  for (const a of articles) {
    const c = a.category ?? 'other';
    if (!g[c]) g[c] = [];
    g[c].push(a);
  }
  return g;
}

function fallbackDownload(blob: Blob, filename: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

async function downloadImg(url: string, filename: string) {
  try {
    const res = await fetch(`/api/proxy-image?url=${encodeURIComponent(url)}`);
    const blob = await res.blob();
    if ('showSaveFilePicker' in window) {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: filename,
          types: [{ description: 'Image', accept: { 'image/jpeg': ['.jpg'], 'image/webp': ['.webp'] } }],
        });
        const w = await handle.createWritable();
        await w.write(blob);
        await w.close();
        return;
      } catch { /* fall through */ }
    }
    fallbackDownload(blob, filename);
  } catch { fallbackDownload(new Blob(), filename); }
}

function PinLayoutBadge({ layout }: { layout: string }) {
  const labels: Record<string, string> = {
    collage4: '4-panel collage',
    hero3panel: 'hero + 2 panels',
    complete: 'complete scene',
  };
  return <span style={{ fontSize: 9, fontWeight: 600, background: '#fce4e4', color: '#c0392b', padding: '2px 5px', borderRadius: 3 }}>{labels[layout] ?? layout}</span>;
}

function ImageGrid({ images, prefix }: { images: Array<{ url: string; label: string; sublabel?: string }>; prefix: string }) {
  const [downloading, setDownloading] = useState<string | null>(null);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10, marginTop: 10 }}>
      {images.map((img, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ aspectRatio: '2/3', borderRadius: 6, overflow: 'hidden', background: 'var(--border)', position: 'relative' }}>
            <img
              src={`${img.url}?w=300&auto=format`}
              alt={img.label}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              loading="lazy"
            />
          </div>
          <div style={{ fontSize: 10, color: 'var(--t2)', lineHeight: 1.3, fontWeight: 500 }}>{img.label}</div>
          {img.sublabel && <div style={{ fontSize: 9, color: 'var(--t3)' }}>{img.sublabel}</div>}
          <button
            onClick={async () => {
              const key = `${prefix}-${i}`;
              setDownloading(key);
              await downloadImg(img.url, `${prefix}-${i + 1}.jpg`);
              setDownloading(null);
            }}
            disabled={downloading === `${prefix}-${i}`}
            style={{ padding: '3px 0', fontSize: 10, fontFamily: 'inherit', border: '1px solid var(--border)', borderRadius: 4, background: 'white', cursor: 'pointer', color: 'var(--t2)' }}
          >
            {downloading === `${prefix}-${i}` ? '⟳' : '↓'} Download
          </button>
        </div>
      ))}
    </div>
  );
}

function ArticleSection({ article, type }: { article: MediaArticle; type: 'pinterest' | 'sections' }) {
  const [open, setOpen] = useState(false);
  const images = type === 'pinterest'
    ? (article.pinterestPins ?? []).map((p, i) => ({ url: p.url, label: `Pin ${i + 1}`, sublabel: p.layout?.replace(/([A-Z])/g, ' $1').toLowerCase() }))
    : (article.sectionImages ?? []).map((s, i) => ({ url: s.url, label: s.alt ? s.alt.split('–')[0].trim().slice(0, 35) : `Image ${i + 1}`, sublabel: '' }));

  if (!images.length) return null;

  const prefix = `${article.slug}-${type}`;

  return (
    <div style={{ borderBottom: '1px solid var(--border)', padding: '12px 0' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0, fontFamily: 'inherit' }}
      >
        <span style={{ fontSize: 12, color: 'var(--t3)', flexShrink: 0 }}>{open ? '▾' : '▸'}</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{article.title}</span>
        <span style={{ fontSize: 10, fontWeight: 700, background: 'var(--border)', color: 'var(--t3)', padding: '2px 7px', borderRadius: 10, flexShrink: 0 }}>{images.length}</span>
        <a
          href={`https://decoreixy.com/${article.category}/${article.slug}`}
          target="_blank"
          rel="noopener"
          onClick={e => e.stopPropagation()}
          style={{ fontSize: 10, color: 'var(--sage)', textDecoration: 'none', flexShrink: 0 }}
        >↗</a>
      </button>
      {open && <ImageGrid images={images} prefix={prefix} />}
    </div>
  );
}

export default function MediaClient({ defaultTab = 'pinterest' }: { defaultTab?: string }) {
  const [tab, setTab] = useState<'pinterest' | 'sections'>(defaultTab === 'sections' ? 'sections' : 'pinterest');
  const [pinArticles, setPinArticles] = useState<MediaArticle[]>([]);
  const [secArticles, setSecArticles] = useState<MediaArticle[]>([]);
  const [loadingPin, setLoadingPin] = useState(false);
  const [loadingSec, setLoadingSec] = useState(false);
  const [openCats, setOpenCats] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (tab === 'pinterest' && pinArticles.length === 0) {
      setLoadingPin(true);
      fetch('/api/media/pinterest')
        .then(r => r.json())
        .then(d => {
          setPinArticles(d.articles ?? []);
          setOpenCats(new Set((d.articles ?? []).map((a: MediaArticle) => a.category)));
        })
        .finally(() => setLoadingPin(false));
    }
    if (tab === 'sections' && secArticles.length === 0) {
      setLoadingSec(true);
      fetch('/api/media/sections')
        .then(r => r.json())
        .then(d => {
          setSecArticles(d.articles ?? []);
          setOpenCats(new Set((d.articles ?? []).map((a: MediaArticle) => a.category)));
        })
        .finally(() => setLoadingSec(false));
    }
  }, [tab]);

  const articles = tab === 'pinterest' ? pinArticles : secArticles;
  const loading = tab === 'pinterest' ? loadingPin : loadingSec;
  const groups = groupByCategory(articles);
  const toggleCat = (c: string) => setOpenCats(s => { const n = new Set(s); n.has(c) ? n.delete(c) : n.add(c); return n; });

  return (
    <div className="wsbody">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.09em', color: 'var(--t3)', marginBottom: 4 }}>Media Library</div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 400 }}>All Generated Images</div>
        </div>
      </div>

      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid var(--border)', marginBottom: 24 }}>
        {(['pinterest', 'sections'] as const).map(t => (
          <button
            key={t}
            onClick={() => { setTab(t); setOpenCats(new Set()); }}
            style={{
              padding: '10px 20px', fontSize: 13, fontWeight: tab === t ? 700 : 400,
              fontFamily: 'inherit', background: 'none', border: 'none',
              borderBottom: tab === t ? '2px solid var(--t1)' : '2px solid transparent',
              marginBottom: -2, cursor: 'pointer', color: tab === t ? 'var(--t1)' : 'var(--t3)',
            }}
          >
            {t === 'pinterest' ? '📌 Pinterest Pins' : '🖼 Section Images'}
          </button>
        ))}
      </div>

      {loading && <div style={{ padding: 40, textAlign: 'center', color: 'var(--t3)' }}>Loading…</div>}

      {!loading && articles.length === 0 && (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--t3)' }}>
          {tab === 'pinterest'
            ? 'No Pinterest pins saved yet. Pinterest pins are saved to Sanity when you publish a new article.'
            : 'No section images found. Section images are added via the Images stage or "Add Images" on published articles.'}
        </div>
      )}

      {!loading && Object.entries(groups).map(([cat, arts]) => (
        <div key={cat} style={{ marginBottom: 8 }}>
          <button
            onClick={() => toggleCat(cat)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 0', background: 'none', border: 'none', borderBottom: '2px solid var(--border)', cursor: 'pointer', fontFamily: 'inherit', marginBottom: 4 }}
          >
            <span style={{ fontSize: 12, color: 'var(--t3)' }}>{openCats.has(cat) ? '▾' : '▸'}</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--t1)', flex: 1, textAlign: 'left' }}>{catLabel(cat)}</span>
            <span style={{ fontSize: 11, color: 'var(--t3)' }}>{arts.length} articles</span>
          </button>

          {openCats.has(cat) && (
            <div style={{ paddingLeft: 0 }}>
              {arts.map(art => (
                <ArticleSection key={art._id} article={art} type={tab} />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
