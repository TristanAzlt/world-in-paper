'use client';

import { Check } from 'iconoir-react';

export function LoadingSpinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16">
      <div
        className="h-10 w-10 rounded-full animate-spin"
        style={{ border: '3px solid #24242e', borderTopColor: '#2470ff' }}
      />
      {label && <p className="text-sm font-semibold" style={{ color: '#9898aa' }}>{label}</p>}
    </div>
  );
}

export function SuccessState({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16">
      <div
        className="flex h-20 w-20 items-center justify-center rounded-full"
        style={{ backgroundColor: '#2470ff20' }}
      >
        <Check width={36} height={36} style={{ color: '#2470ff' }} />
      </div>
      <p className="text-xl font-bold" style={{ color: '#ffffff' }}>{title}</p>
      {subtitle && <p className="text-sm" style={{ color: '#9898aa' }}>{subtitle}</p>}
    </div>
  );
}
