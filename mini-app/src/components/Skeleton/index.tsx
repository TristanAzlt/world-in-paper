'use client';

export function SkeletonCard() {
  return (
    <div className="w-full overflow-hidden rounded-3xl animate-pulse" style={{ backgroundColor: '#1c1c24' }}>
      <div className="p-5 pb-3">
        <div className="flex items-center justify-between">
          <div className="h-5 w-32 rounded-lg" style={{ backgroundColor: '#24242e' }} />
          <div className="h-5 w-16 rounded-full" style={{ backgroundColor: '#24242e' }} />
        </div>
        <div className="mt-3 flex gap-4">
          <div className="h-4 w-20 rounded" style={{ backgroundColor: '#24242e' }} />
          <div className="h-4 w-16 rounded" style={{ backgroundColor: '#24242e' }} />
        </div>
      </div>
      <div className="px-5 py-3" style={{ backgroundColor: '#24242e' }}>
        <div className="h-4 w-24 rounded" style={{ backgroundColor: '#2e2e3a' }} />
      </div>
    </div>
  );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="flex items-center justify-between py-3 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="h-5 w-5 rounded-full" style={{ backgroundColor: '#24242e' }} />
        <div>
          <div className="h-4 w-24 rounded" style={{ backgroundColor: '#24242e' }} />
          <div className="h-3 w-16 rounded mt-1" style={{ backgroundColor: '#24242e' }} />
        </div>
      </div>
      <div className="h-4 w-12 rounded" style={{ backgroundColor: '#24242e' }} />
    </div>
  );
}

export function SkeletonStats() {
  return (
    <div className="mb-6 text-center animate-pulse">
      <div className="h-3 w-20 rounded mx-auto mb-2" style={{ backgroundColor: '#24242e' }} />
      <div className="h-10 w-40 rounded-lg mx-auto" style={{ backgroundColor: '#24242e' }} />
      <div className="h-5 w-16 rounded mx-auto mt-2" style={{ backgroundColor: '#24242e' }} />
    </div>
  );
}

export function SkeletonPosition() {
  return (
    <div className="flex items-center justify-between rounded-2xl p-4 animate-pulse" style={{ backgroundColor: '#1c1c24' }}>
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full" style={{ backgroundColor: '#24242e' }} />
        <div>
          <div className="h-4 w-16 rounded" style={{ backgroundColor: '#24242e' }} />
          <div className="h-3 w-24 rounded mt-1" style={{ backgroundColor: '#24242e' }} />
        </div>
      </div>
      <div className="h-4 w-12 rounded" style={{ backgroundColor: '#24242e' }} />
    </div>
  );
}
