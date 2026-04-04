'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { type AssetToken, type OriginKey } from '@/types';

interface AssetsResult {
  tokens: AssetToken[];
  categories?: {
    crypto: AssetToken[];
    stocks: AssetToken[];
    indices: AssetToken[];
    commodities: AssetToken[];
  };
}

const cache = new Map<string, { data: AssetsResult; ts: number }>();
const CACHE_TTL = 60000;

export function useAssets(origin: OriginKey) {
  const [data, setData] = useState<AssetsResult>({ tokens: [] });
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    const cached = cache.get(origin);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      setData(cached.data);
      setLoading(false);
      return;
    }

    try {
      const res = await api<AssetsResult>(`/assets?origin=${origin}`);
      cache.set(origin, { data: res, ts: Date.now() });
      setData(res);
    } catch (e) {
      console.error('Failed to fetch assets:', e);
    } finally {
      setLoading(false);
    }
  }, [origin]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { ...data, loading, refetch: fetch };
}
