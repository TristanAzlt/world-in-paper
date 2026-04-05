'use client';

import { useState, useCallback, useRef } from 'react';
import { api } from '@/lib/api';
import { type QuoteResponse, type OriginKey } from '@/types';

export function useQuote() {
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout>(undefined);

  const getQuote = useCallback(async (
    assetId: string,
    origin: OriginKey,
    isBuy: boolean,
    amount: string,
  ) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    return new Promise<QuoteResponse | null>((resolve) => {
      debounceRef.current = setTimeout(async () => {
        setLoading(true);
        setFailed(false);
        try {
          const data = await api<QuoteResponse>('/quote', {
            method: 'POST',
            body: JSON.stringify({ assetId, origin, isBuy, amount }),
          });
          setQuote(data);
          resolve(data);
        } catch (e) {
          console.error('Quote failed:', e);
          setQuote(null);
          setFailed(true);
          resolve(null);
        } finally {
          setLoading(false);
        }
      }, 500);
    });
  }, []);

  return { quote, loading, failed, getQuote };
}
