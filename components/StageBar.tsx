'use client';

import Link from 'next/link';

interface Props {
  articleId: string;
  currentStage: 'outline' | 'brief' | 'roundup' | 'write' | 'images' | 'shop' | 'compose' | 'publish';
  articleTitle?: string;
  isProduct?: boolean;
}

const STAGES = [
  { key: 'outline',   label: 'Outline',   productLabel: 'Brief', num: 1 },
  { key: 'write',     label: 'Write',     num: 2 },
  { key: 'images',    label: 'Images',    num: 3 },
  { key: 'shop',      label: 'Shop',      num: 4 },
  { key: 'compose',   label: 'Compose',   num: 5 },
  { key: 'publish',   label: 'Publish',   num: 6 },
] as const;

const stageOrder = ['outline', 'brief', 'roundup', 'write', 'images', 'shop', 'compose', 'publish'];

export default function StageBar({ articleId, currentStage, articleTitle, isProduct }: Props) {
  const stageHref = (key: string) => {
    if (key === 'outline') return `/article/${articleId}/${isProduct ? 'brief' : 'outline'}`;
    return `/article/${articleId}/${key}`;
  };

  const stageNum = (key: string) => {
    const map: Record<string, number> = {
      outline: 1, brief: 1, roundup: 1,
      write: 2,
      images: 3,
      shop: 4,
      compose: 5,
      publish: 6,
    };
    return map[key] ?? 0;
  };

  const currentNum = stageNum(currentStage);

  return (
    <div className="stagebar">
      {STAGES.map((s, i) => {
        const num = s.num;
        const isDone = num < currentNum;
        const isActive = num === currentNum;
        const label = s.key === 'outline' && isProduct ? (s as any).productLabel ?? s.label : s.label;

        return (
          <>
            {i > 0 && <div className="sarr" key={`arr-${s.key}`}>→</div>}
            <Link
              key={s.key}
              href={stageHref(s.key)}
              className={`stage ${isDone ? 'done' : isActive ? 'active' : ''}`}
              style={{ textDecoration: 'none' }}
            >
              <div className="sn">{isDone ? '✓' : num}</div>
              <div className="sl" style={'isPin' in s ? { color: 'var(--pin)' } : undefined}>
                {label}
              </div>
            </Link>
          </>
        );
      })}

      {articleTitle && (
        <div className="art-lbl">
          <span style={{ fontSize: 10 }}>Editing:</span>
          <strong>{articleTitle}</strong>
        </div>
      )}
    </div>
  );
}
