'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface DraftSummary {
  _id: string;
  title: string;
  slug: string;
  category: string;
  type: string;
  cluster: string | null;
  _createdAt: string;
  _updatedAt: string;
  hasFeaturedImage: boolean;
}

export default function DraftsPage() {
  const [drafts, setDrafts] = useState<DraftSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/drafts')
      .then(r => r.json())
      .then(d => setDrafts(d.drafts ?? []))
      .catch(() => setError('Failed to load drafts'))
      .finally(() => setLoading(false));
  }, []);

  function fmt(iso: string) {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  return (
    <div style={{ padding: '32px 24px', maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#FDFAF6' }}>
          Drafts for Review
        </h1>
        <span style={{ fontSize: 13, color: 'var(--t3)' }}>{drafts.length} draft{drafts.length !== 1 ? 's' : ''}</span>
      </div>

      {loading && <p style={{ color: 'var(--t3)', fontSize: 14 }}>Loading…</p>}
      {error && <p style={{ color: '#e05252', fontSize: 14 }}>{error}</p>}

      {!loading && drafts.length === 0 && (
        <p style={{ color: 'var(--t3)', fontSize: 14 }}>No drafts waiting for review.</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {drafts.map(d => (
          <Link
            key={d._id}
            href={`/drafts/${encodeURIComponent(d._id)}`}
            style={{ textDecoration: 'none' }}
          >
            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
              cursor: 'pointer',
              transition: 'border-color 0.15s',
            }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--sage)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: 14, color: '#FDFAF6', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {d.title}
                </p>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--t3)' }}>
                  {d.category} · {d.type} · /{d.slug}
                  {d.cluster ? ` · cluster: ${d.cluster}` : ''}
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                {d.hasFeaturedImage && (
                  <span style={{ fontSize: 11, background: '#2a4a3a', color: 'var(--sage)', padding: '2px 7px', borderRadius: 4, fontWeight: 700 }}>
                    IMG
                  </span>
                )}
                <span style={{ fontSize: 11, color: 'var(--t3)' }}>{fmt(d._updatedAt)}</span>
                <span style={{ fontSize: 13, color: 'var(--sage)', fontWeight: 700 }}>Review →</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
