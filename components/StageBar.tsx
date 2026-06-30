'use client';

import Link from 'next/link';

interface Props {
  articleId: string;
  currentStage: 'outline' | 'brief' | 'roundup' | 'write' | 'images' | 'shop' | 'compose' | 'publish';
  articleTitle?: string;
  isProduct?: boolean;
}

const EDITORIAL_STAGES = [
  { key: 'outline', label: 'Outline', num: 1 },
  { key: 'write',   label: 'Write',   num: 2 },
  { key: 'images',  label: 'Images',  num: 3 },
  { key: 'shop',    label: 'Shop',    num: 4 },
  { key: 'compose', label: 'Compose', num: 5 },
  { key: 'publish', label: 'Publish', num: 6 },
];

const PRODUCT_STAGES = [
  { key: 'brief',   label: 'Brief',   num: 1 },
  { key: 'write',   label: 'Write',   num: 2 },
  { key: 'compose', label: 'Compose', num: 3 },
  { key: 'publish', label: 'Publish', num: 4 },
];

const EDITORIAL_NUM: Record<string, number> = {
  outline: 1, brief: 1, roundup: 1,
  write: 2, images: 3, shop: 4, compose: 5, publish: 6,
};

const PRODUCT_NUM: Record<string, number> = {
  brief: 1, roundup: 1,
  write: 2,
  compose: 3,
  publish: 4,
};

export default function StageBar({ articleId, currentStage, articleTitle, isProduct }: Props) {
  const stages = isProduct ? PRODUCT_STAGES : EDITORIAL_STAGES;
  const numMap = isProduct ? PRODUCT_NUM : EDITORIAL_NUM;
  const currentNum = numMap[currentStage] ?? 0;

  const stageHref = (key: string) => {
    if (key === 'outline' || key === 'brief') return `/article/${articleId}/${isProduct ? 'brief' : 'outline'}`;
    return `/article/${articleId}/${key}`;
  };

  return (
    <div className="stagebar">
      {stages.map((s, i) => {
        const isDone = s.num < currentNum;
        const isActive = s.num === currentNum;
        return (
          <>
            {i > 0 && <div className="sarr" key={`arr-${s.key}`}>→</div>}
            <Link
              key={s.key}
              href={stageHref(s.key)}
              className={`stage ${isDone ? 'done' : isActive ? 'active' : ''}`}
              style={{ textDecoration: 'none' }}
            >
              <div className="sn">{isDone ? '✓' : s.num}</div>
              <div className="sl">{s.label}</div>
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
