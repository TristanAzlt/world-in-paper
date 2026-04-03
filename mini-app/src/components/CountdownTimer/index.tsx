'use client';

import { Clock } from 'iconoir-react';
import { useEffect, useState } from 'react';

interface CountdownTimerProps {
  targetTime: number;
  label?: string;
}

function formatRemaining(ms: number): string {
  if (ms <= 0) return '0s';
  const seconds = Math.floor(ms / 1000) % 60;
  const minutes = Math.floor(ms / 60000) % 60;
  const hours = Math.floor(ms / 3600000) % 24;
  const days = Math.floor(ms / 86400000);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m ${seconds}s`;
}

export function CountdownTimer({ targetTime, label }: CountdownTimerProps) {
  const [remaining, setRemaining] = useState(targetTime - Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining(targetTime - Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [targetTime]);

  return (
    <div className="flex items-center gap-1.5 text-sm text-gray-500">
      <Clock width={14} height={14} />
      {label && <span>{label}</span>}
      <span className="font-medium tabular-nums">{formatRemaining(remaining)}</span>
    </div>
  );
}
