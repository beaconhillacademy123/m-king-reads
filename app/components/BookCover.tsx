'use client';

import { useState } from 'react';

const PALETTES = [
  ['#1f2a44', '#d4a84b'], ['#3b1f2b', '#e7b77a'], ['#18392b', '#d9c27a'], ['#2b2340', '#c9a3ff'],
  ['#402218', '#f0b37e'], ['#0f3340', '#7fd1c7'], ['#33261a', '#e8cf9a'], ['#24243e', '#f2c14e'],
];

function hash(value: string) {
  let h = 0;
  for (let i = 0; i < value.length; i += 1) h = (h * 31 + value.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export default function BookCover({ src, title, author, size = 'md', className = '' }: {
  src?: string | null; title: string; author?: string | null; size?: 'sm' | 'md' | 'lg' | 'xl'; className?: string;
}) {
  const [failed, setFailed] = useState(!src);
  const [bg, fg] = PALETTES[hash(title) % PALETTES.length];
  return (
    <div className={`cover cover-${size} ${className}`}>
      {!failed && src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={`Cover of ${title}`} loading="lazy" decoding="async" onError={() => setFailed(true)} />
      ) : (
        <div className="coverFallback" style={{ background: `linear-gradient(160deg, ${bg}, #0b0d14)`, color: fg }}>
          <span className="coverFallbackRule" style={{ background: fg }} />
          <strong>{title}</strong>
          {author && <small>{author}</small>}
          <span className="coverFallbackMark">M·K·R</span>
        </div>
      )}
      <span className="coverSpine" aria-hidden />
    </div>
  );
}
