'use client';

import { useState } from 'react';
import Link from 'next/link';

type Fix = string;
type Result = { ok: boolean; fixCount: number; fixes: Fix[] };

export default function SeoAgentPage() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState('');

  const run = async () => {
    setRunning(true);
    setResult(null);
    setError('');
    try {
      const res = await fetch('/api/seo-agent', {
        headers: { authorization: `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET ?? 'wabi-seo-2026'}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Agent failed');
      setResult(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setRunning(false);
    }
  };

  const categoryIcon = (fix: string) => {
    if (fix.startsWith('BRANCH→MOTHER')) return '↑';
    if (fix.startsWith('MOTHER→BRANCH')) return '↓';
    if (fix.startsWith('MOTHER→MOTHER')) return '↔';
    if (fix.startsWith('EXTERNAL')) return '↗';
    return '•';
  };

  const fixColor = (fix: string) => {
    if (fix.startsWith('BRANCH→MOTHER')) return '#6B7F5E';
    if (fix.startsWith('MOTHER→BRANCH')) return '#8A6E52';
    if (fix.startsWith('MOTHER→MOTHER')) return '#5C7A8A';
    if (fix.startsWith('EXTERNAL')) return '#7A5C8A';
    return 'var(--t2)';
  };

  const fixLabel = (fix: string) => fix.replace(/^(BRANCH→MOTHER|MOTHER→BRANCH|MOTHER→MOTHER|EXTERNAL LINK):\s*/, '');

  return (
    <div className="wsbody" style={{ maxWidth: 700 }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.09em', color: 'var(--sage)', marginBottom: 4 }}>
          SEO Automation
        </div>
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 400, marginBottom: 6 }}>
          SEO Agent
        </div>
        <div style={{ fontSize: 12, color: 'var(--t3)', lineHeight: 1.6 }}>
          Runs automatically every Monday at 9am. You can also run it manually here anytime.
        </div>
      </div>

      {/* What it does */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '16px 20px', marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--t3)', marginBottom: 12 }}>
          What the agent checks
        </div>
        {[
          { icon: '↑', color: '#6B7F5E', label: 'Branch → Mother', detail: 'Every cluster article links back to its pillar guide' },
          { icon: '↓', color: '#8A6E52', label: 'Mother → Branches', detail: 'Every pillar guide links to all its cluster articles' },
          { icon: '↔', color: '#5C7A8A', label: 'Mother → Mother', detail: 'Each pillar links to one related pillar in same category' },
          { icon: '↗', color: '#7A5C8A', label: 'External links', detail: 'Every article has at least one link to an authority site' },
        ].map((item, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: i < 3 ? 10 : 0 }}>
            <span style={{ fontSize: 14, color: item.color, fontWeight: 700, width: 18, flexShrink: 0, textAlign: 'center' }}>{item.icon}</span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--t1)' }}>{item.label}</div>
              <div style={{ fontSize: 11, color: 'var(--t3)' }}>{item.detail}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Run button */}
      <button
        onClick={run}
        disabled={running}
        className="btn btn-sage"
        style={{ fontSize: 14, padding: '12px 32px', marginBottom: 20 }}
      >
        {running ? '⟳ Running audit…' : '▶ Run SEO audit now'}
      </button>

      {running && (
        <div style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 20, lineHeight: 1.6 }}>
          Scanning all published articles and fixing missing links… this takes 30–60 seconds.
        </div>
      )}

      {error && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 'var(--r)', padding: '12px 16px', color: '#991B1B', fontSize: 13, marginBottom: 20 }}>
          ✕ {error}
        </div>
      )}

      {result && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', background: 'var(--sbg)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: result.fixCount > 0 ? 'var(--sage)' : 'var(--t2)' }}>
              {result.fixCount > 0 ? `✓ ${result.fixCount} fix${result.fixCount === 1 ? '' : 'es'} applied` : '✓ Everything looks good — no fixes needed'}
            </div>
            {result.fixCount > 0 && (
              <div style={{ fontSize: 11, color: 'var(--t3)' }}>Site rebuild triggered</div>
            )}
          </div>
          {result.fixes.length > 0 && (
            <div style={{ padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {result.fixes.map((fix, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 13, color: fixColor(fix), fontWeight: 700, flexShrink: 0, width: 18, textAlign: 'center' }}>
                    {categoryIcon(fix)}
                  </span>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: fixColor(fix), marginBottom: 1 }}>
                      {fix.split(':')[0]}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--t2)' }}>{fixLabel(fix)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div style={{ marginTop: 24 }}>
        <Link href="/" style={{ fontSize: 12, color: 'var(--t3)', textDecoration: 'none' }}>← Back to queue</Link>
      </div>
    </div>
  );
}
