import clsx from 'clsx';
import type { ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: string;
  icon?: ReactNode;
  variant?: 'default' | 'positive' | 'negative';
}

export function StatCard({ label, value, icon, variant = 'default' }: StatCardProps) {
  return (
    <div
      className={clsx(
        'flex flex-1 flex-col items-center gap-1 rounded-xl p-3',
        variant === 'positive' && 'bg-green-50',
        variant === 'negative' && 'bg-red-50',
        variant === 'default' && 'bg-gray-50',
      )}
    >
      {icon && <div className="text-gray-400">{icon}</div>}
      <span
        className={clsx(
          'text-lg font-semibold',
          variant === 'positive' && 'text-green-600',
          variant === 'negative' && 'text-red-600',
          variant === 'default' && 'text-gray-900',
        )}
      >
        {value}
      </span>
      <span className="text-xs text-gray-500">{label}</span>
    </div>
  );
}
