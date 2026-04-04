'use client';

import { Check } from 'iconoir-react';

export function LoadingSpinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-5 py-16">
      <div className="flex gap-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-3 w-3 rounded-full"
            style={{
              backgroundColor: '#2470ff',
              animation: `dotBounce 1.2s ease-in-out ${i * 0.15}s infinite`,
            }}
          />
        ))}
      </div>
      {label && (
        <p className="text-[15px] font-semibold" style={{ color: '#ffffff' }}>{label}</p>
      )}
    </div>
  );
}

export function SuccessState({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16">
      <div
        className="flex h-20 w-20 items-center justify-center rounded-full"
        style={{
          backgroundColor: '#2470ff15',
          boxShadow: '0 0 40px #2470ff30',
          animation: 'successPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both',
        }}
      >
        <Check width={36} height={36} style={{ color: '#2470ff' }} strokeWidth={2.5} />
      </div>
      <p className="text-xl font-bold" style={{ color: '#ffffff' }}>{title}</p>
      {subtitle && <p className="text-sm" style={{ color: '#9898aa' }}>{subtitle}</p>}
    </div>
  );
}
