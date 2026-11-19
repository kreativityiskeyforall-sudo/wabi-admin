'use client';
import { useEffect } from 'react';

// Fixed-position toast shown after Save as Draft — always visible regardless of scroll position.
interface Props {
  msg: string;         // empty string = hidden
  onDismiss: () => void;
}

export default function DraftToast({ msg, onDismiss }: Props) {
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(onDismiss, 10000);
    return () => clearTimeout(t);
  }, [msg, onDismiss]);

  if (!msg) return null;

  const isError = msg.startsWith('✕');
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 9999,
        maxWidth: 420,
        background: isError ? '#FEF2F2' : '#fff',
        border: `1.5px solid ${isError ? '#FECACA' : 'var(--sage)'}`,
        borderRadius: 10,
        padding: '14px 18px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.13)',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <span style={{
          fontSize: 13, fontWeight: 700, lineHeight: 1.4,
          color: isError ? '#991B1B' : 'var(--sage)',
        }}>
          {msg}
        </span>
        <button
          onClick={onDismiss}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--t3)', padding: 0, lineHeight: 1, flexShrink: 0 }}
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
      {!isError && (
        <a href="/drafts" style={{ fontSize: 12, color: 'var(--sage)', fontWeight: 600, textDecoration: 'underline' }}>
          Open Drafts for Review →
        </a>
      )}
    </div>
  );
}
