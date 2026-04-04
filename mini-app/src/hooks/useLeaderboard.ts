'use client';

import { useEffect, useState, useRef } from 'react';
import { api } from '@/lib/api';
import type { GameRankingEntry, PlayerPortfolio, AssetToken, OriginKey } from '@/types';

const ORIGIN_NUM_TO_KEY: Record<string, OriginKey> = {
  '0': 'solana', '1': 'base', '2': 'ethereum', '3': 'bsc', '4': 'worldchain', '5': 'hyperliquid',
};

export interface LeaderboardEntry {
  player: string;
  place: number;
  totalValue: number;
}

export function useLeaderboard(gameId: string | undefined, ranking: GameRankingEntry[]) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [refreshCount, setRefreshCount] = useState(0);
  const lastRankingKey = useRef('');
  const enriched = useRef(false);

  const refresh = () => { enriched.current = false; setRefreshCount((c) => c + 1); };

  // Serialize ranking to detect real changes
  const rankingKey = ranking.map((r) => `${r.player}:${r.wipBalance}`).join(',');

  useEffect(() => {
    if (ranking.length === 0) { setEntries([]); return; }

    const rankingChanged = rankingKey !== lastRankingKey.current;
    lastRankingKey.current = rankingKey;

    // Only reset to cash-only if ranking actually changed or never enriched
    if (rankingChanged || !enriched.current) {
      const cashOnly: LeaderboardEntry[] = ranking.map((r, i) => ({
        player: r.player,
        place: i + 1,
        totalValue: Number(r.wipBalance) / 1e6,
      }));
      if (!enriched.current) setEntries(cashOnly);
    }

    if (!gameId) return;

    // Then: enrich with real portfolio values
    let cancelled = false;

    (async () => {
      try {
        const portfolios = await Promise.all(
          ranking.map(async (r) => {
            try {
              return await api<PlayerPortfolio>(`/games/portfolio?gameId=${gameId}&user=${r.player}`);
            } catch { return null; }
          }),
        );

        if (cancelled) return;

        // Collect origins
        const originSet = new Set<OriginKey>();
        for (const p of portfolios) {
          if (!p) continue;
          for (const t of p.tokens) {
            const key = ORIGIN_NUM_TO_KEY[t.origin];
            if (key) originSet.add(key);
          }
        }

        // Fetch prices
        const priceMap: Record<string, { price: number; decimals: number }> = {};
        await Promise.all(
          [...originSet].map(async (origin) => {
            try {
              const data = await api<{ tokens: AssetToken[]; categories?: Record<string, AssetToken[]> }>(
                `/assets?origin=${origin}`,
              );
              const all = data.categories ? Object.values(data.categories).flat() : data.tokens;
              for (const a of all) {
                priceMap[a.address.toLowerCase()] = { price: a.price, decimals: a.decimals ?? 6 };
              }
            } catch { /* skip */ }
          }),
        );

        if (cancelled) return;

        // Compute total value
        const computed = ranking.map((r, i) => {
          const p = portfolios[i];
          const wip = Number(r.wipBalance) / 1e6;
          let pos = 0;
          if (p) {
            for (const t of p.tokens) {
              const info = priceMap[t.asset_address.toLowerCase()];
              if (info && info.price > 0) {
                pos += (Number(t.balance) / 10 ** info.decimals) * info.price;
              }
            }
          }
          return { player: r.player, place: 0, totalValue: wip + pos };
        });

        computed.sort((a, b) => b.totalValue - a.totalValue);
        computed.forEach((e, i) => { e.place = i + 1; });

        enriched.current = true;
        setEntries(computed);
      } catch { /* keep cashOnly */ }
    })();

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId, rankingKey, refreshCount]);

  return { entries, refresh };
}
