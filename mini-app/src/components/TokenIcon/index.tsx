'use client';

import { useState } from 'react';
import { QuestionMark } from 'iconoir-react';

interface TokenIconProps {
  src: string;
  alt: string;
  size?: number;
}

const ICON_OVERRIDES: Record<string, string> = {
  ETH: '/ethereum-eth.svg',
};

export function TokenIcon({ src, alt, size = 40 }: TokenIconProps) {
  const resolvedSrc = ICON_OVERRIDES[alt] || src;
  const [error, setError] = useState(false);

  if (error || !resolvedSrc) {
    return (
      <div
        className="flex items-center justify-center rounded-full"
        style={{ width: size, height: size, backgroundColor: '#2e2e3a' }}
      >
        <QuestionMark width={size * 0.55} height={size * 0.55} style={{ color: '#9898aa' }} strokeWidth={2.5} />
      </div>
    );
  }

  return (
    <img
      src={resolvedSrc}
      alt={alt}
      className="rounded-full"
      style={{ width: size, height: size, backgroundColor: '#24242e' }}
      onError={() => setError(true)}
    />
  );
}
