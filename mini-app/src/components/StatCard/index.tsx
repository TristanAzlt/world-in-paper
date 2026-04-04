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
        variant === 'default' && 'bg-[#24242e]',
      )}
    >
      {icon && <div className="text-[#6a6a7a]">{icon}</div>}
      <span
        className={clsx(
          'text-lg font-semibold',
          variant === 'positive' && 'text-[#34c759]',
          variant === 'negative' && 'text-[#ff6b6b]',
          variant === 'default' && 'text-white',
        )}
      >
        {value}
      </span>
      <span className="text-xs text-[#9898aa]">{label}</span>
    </div>
  );
}
