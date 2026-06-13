'use client';

import { useEffect, useState } from 'react';

interface Comment {
  _id: string;
  name: string;
  email: string;
  body: string;
  articleSlug: string;
  articleTitle: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending: '#f59e0b',
  approved: '#10b981',
  rejected: '#ef4444',
};

export default function CommentsPage() {
  const [comments, setComments] = useState<Comment[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    fetchComments();
  }, []);

  async function fetchComments() {
    setLoading(true);
    try {
      const res = await fetch('/api/comments');
      const data = await res.json();
      setComments(data.comments || []);
    } catch {
      console.error('Failed to load comments');
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(id: string, status: 'approved' | 'rejected') {
    setUpdating(id);
    try {
      const res = await fetch('/api/comments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      if (res.ok) {
        setComments(prev => prev.map(c => c._id === id ? { ...c, status } : c));
      }
    } finally {
      setUpdating(null);
    }
  }

  async function deleteComment(id: string) {
    if (!confirm('Delete this comment permanently?')) return;
    setUpdating(id);
    try {
      const res = await fetch(`/api/comments?id=${id}`, { method: 'DELETE' });
      if (res.ok) setComments(prev => prev.filter(c => c._id !== id));
    } finally {
      setUpdating(null);
    }
  }

  const filtered = filter === 'all' ? comments : comments.filter(c => c.status === filter);
  const counts = {
    all: comments.length,
    pending: comments.filter(c => c.status === 'pending').length,
    approved: comments.filter(c => c.status === 'approved').length,
    rejected: comments.filter(c => c.status === 'rejected').length,
  };

  return (
    <div style={{ padding: '32px', maxWidth: '900px' }}>
      <h1 style={{ fontFamily: 'Playfair Display', fontSize: '28px', marginBottom: '8px' }}>Comments</h1>
      <p style={{ color: '#888', fontSize: '14px', marginBottom: '28px' }}>
        Approve comments to publish them on the site. Approved comments appear after the next site rebuild.
      </p>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid #e8e8e8', paddingBottom: '16px' }}>
        {(['pending', 'approved', 'rejected', 'all'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            style={{
              padding: '6px 16px',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: filter === tab ? 700 : 400,
              background: filter === tab ? '#1a1a1a' : '#f5f5f5',
              color: filter === tab ? '#fff' : '#555',
              fontFamily: 'DM Sans',
            }}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)} ({counts[tab]})
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ color: '#888', fontSize: '14px' }}>Loading comments…</p>
      ) : filtered.length === 0 ? (
        <p style={{ color: '#888', fontSize: '14px' }}>No {filter === 'all' ? '' : filter} comments.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filtered.map(comment => (
            <div
              key={comment._id}
              style={{
                background: '#fff',
                border: '1px solid #e8e8e8',
                borderRadius: '8px',
                padding: '20px 24px',
                opacity: updating === comment._id ? 0.5 : 1,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 700, fontSize: '15px', fontFamily: 'DM Sans' }}>{comment.name}</span>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: '12px',
                      background: STATUS_COLORS[comment.status] + '22',
                      color: STATUS_COLORS[comment.status],
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                    }}>
                      {comment.status}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#888', fontFamily: 'DM Sans' }}>
                    {comment.email} · {new Date(comment.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                  <div style={{ fontSize: '12px', color: '#5a9e8a', marginTop: '2px', fontFamily: 'DM Sans' }}>
                    On: {comment.articleTitle || comment.articleSlug}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                  {comment.status !== 'approved' && (
                    <button
                      onClick={() => updateStatus(comment._id, 'approved')}
                      disabled={updating === comment._id}
                      style={{
                        padding: '7px 16px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                        background: '#10b981', color: '#fff', border: 'none', borderRadius: '4px',
                        fontFamily: 'DM Sans',
                      }}
                    >
                      Approve
                    </button>
                  )}
                  {comment.status !== 'rejected' && (
                    <button
                      onClick={() => updateStatus(comment._id, 'rejected')}
                      disabled={updating === comment._id}
                      style={{
                        padding: '7px 16px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                        background: '#f5f5f5', color: '#555', border: 'none', borderRadius: '4px',
                        fontFamily: 'DM Sans',
                      }}
                    >
                      Reject
                    </button>
                  )}
                  <button
                    onClick={() => deleteComment(comment._id)}
                    disabled={updating === comment._id}
                    style={{
                      padding: '7px 12px', fontSize: '12px', cursor: 'pointer',
                      background: 'transparent', color: '#ef4444', border: '1px solid #ef4444', borderRadius: '4px',
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
              <p style={{ fontSize: '14px', lineHeight: 1.7, color: '#333', margin: 0, fontFamily: 'DM Sans' }}>
                {comment.body}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
