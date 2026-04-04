'use client';

import { useState } from 'react';
import { QuestionMark } from 'iconoir-react';

interface TokenIconProps {
  src: string;
  alt: string;
  size?: number;
}

export function TokenIcon({ src, alt, size = 40 }: TokenIconProps) {
  const [error, setError] = useState(false);

  if (error || !src) {
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
      src={src}
      alt={alt}
      className="rounded-full"
      style={{ width: size, height: size, backgroundColor: '#24242e' }}
      onError={() => setError(true)}
    />
  );
}
