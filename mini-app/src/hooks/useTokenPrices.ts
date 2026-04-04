'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import type { AssetToken, OriginKey, PortfolioToken } from '@/types';

const ORIGIN_NUM_TO_KEY: Record<string, OriginKey> = {
  '0': 'solana',
  '1': 'base',
  '2': 'ethereum',
  '3': 'bsc',
  '4': 'worldchain',
  '5': 'hyperliquid',
};

interface TokenInfo {
  price: number;
  symbol: string;
  name: string;
  image: string;
}

export function useTokenPrices(tokens: PortfolioToken[]) {
  const [prices, setPrices] = useState<Record<string, TokenInfo>>({});

  const fetch = useCallback(async () => {
    if (!tokens.length) return;

    const origins = [...new Set(tokens.map((t) => ORIGIN_NUM_TO_KEY[t.origin]).filter(Boolean))];
    const map: Record<string, TokenInfo> = {};

    await Promise.all(
      origins.map(async (origin) => {
        try {
          const data = await api<{ tokens: AssetToken[]; categories?: Record<string, AssetToken[]> }>(
            `/assets?origin=${origin}`,
          );
          const allAssets = data.categories
            ? Object.values(data.categories).flat()
            : data.tokens;

          for (const asset of allAssets) {
            map[asset.address.toLowerCase()] = {
              price: asset.price,
              symbol: asset.symbol,
              name: asset.name,
              image: asset.image,
            };
          }
        } catch (e) {
          console.error(`Failed to fetch prices for ${origin}:`, e);
        }
      }),
    );

    setPrices(map);
  }, [tokens]);

  useEffect(() => {
    fetch();
    const interval = setInterval(fetch, 30000);
    return () => clearInterval(interval);
  }, [fetch]);

  return prices;
}
