'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { type GameRankingEntry, type PlayerPortfolio } from '@/types';

export function useGameRanking(gameId?: string) {
  const [ranking, setRanking] = useState<GameRankingEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!gameId) { setLoading(false); return; }
    try {
      const data = await api<{ ranking: GameRankingEntry[] }>(`/games/ranking?gameId=${gameId}`);
      setRanking(data.ranking);
    } catch (e) {
      console.error('Failed to fetch ranking:', e);
    } finally {
      setLoading(false);
    }
  }, [gameId]);

  useEffect(() => {
    fetch();
    const interval = setInterval(fetch, 15000);
    return () => clearInterval(interval);
  }, [fetch]);

  return { ranking, loading, refetch: fetch };
}

export function usePlayerPortfolio(gameId?: string, walletAddress?: string) {
  const [portfolio, setPortfolio] = useState<PlayerPortfolio | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!gameId || !walletAddress) { setLoading(false); return; }
    try {
      const data = await api<PlayerPortfolio>(`/games/portfolio?gameId=${gameId}&user=${walletAddress}`);
      setPortfolio(data);
    } catch {
      // Portfolio may not exist yet (game not started, user not joined)
    } finally {
      setLoading(false);
    }
  }, [gameId, walletAddress]);

  useEffect(() => {
    fetch();
    const interval = setInterval(fetch, 15000);
    return () => clearInterval(interval);
  }, [fetch]);

  return { portfolio, loading, refetch: fetch };
}
