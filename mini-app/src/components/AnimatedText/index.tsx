'use client';

import { TextMorph } from 'torph/react';

interface AnimatedTextProps {
  children: string;
  className?: string;
  style?: React.CSSProperties;
}

export function AnimatedText({ children, className, style }: AnimatedTextProps) {
  return (
    <TextMorph className={className} style={style}>
      {children}
    </TextMorph>
  );
}
