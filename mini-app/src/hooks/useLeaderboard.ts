'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import type { GameRankingEntry, PlayerPortfolio, AssetToken } from '@/types';

interface LeaderboardEntry {
  player: string;
  place: number;
  totalValue: number;
  wipBalance: number;
}

export function useLeaderboard(
  gameId: string | undefined,
  ranking: GameRankingEntry[],
  tokenPrices: Record<string, { price: number; decimals: number }>,
) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const compute = useCallback(async () => {
    if (!gameId || ranking.length === 0) return;
    setLoading(true);

    try {
      // Fetch all portfolios in parallel
      const portfolios = await Promise.all(
        ranking.map(async (r) => {
          try {
            return await api<PlayerPortfolio>(`/games/portfolio?gameId=${gameId}&user=${r.player}`);
          } catch {
            return null;
          }
        }),
      );

      // Compute total value for each player
      const computed = ranking.map((r, i) => {
        const p = portfolios[i];
        const wipBalance = Number(r.wipBalance) / 1e6;

        let positionsValue = 0;
        if (p) {
          for (const t of p.tokens) {
            const info = tokenPrices[t.asset_address.toLowerCase()];
            if (info && info.price > 0) {
              const dec = info.decimals ?? 18;
              const bal = Number(t.balance) / 10 ** dec;
              positionsValue += bal * info.price;
            }
          }
        }

        return {
          player: r.player,
          place: 0,
          totalValue: wipBalance + positionsValue,
          wipBalance,
        };
      });

      // Sort by total value descending
      computed.sort((a, b) => b.totalValue - a.totalValue);
      computed.forEach((e, i) => { e.place = i + 1; });

      setEntries(computed);
    } catch {
      // Fallback to basic ranking
      setEntries(
        ranking.map((r, i) => ({
          player: r.player,
          place: i + 1,
          totalValue: Number(r.wipBalance) / 1e6,
          wipBalance: Number(r.wipBalance) / 1e6,
        })),
      );
    } finally {
      setLoading(false);
    }
  }, [gameId, ranking, tokenPrices]);

  useEffect(() => {
    compute();
  }, [compute]);

  return { entries, loading };
}
