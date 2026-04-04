'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { type GameView, getGameStatus, GameStatus } from '@/types';

export function useExploreGames() {
  const [games, setGames] = useState<GameView[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    try {
      const data = await api<{ games: GameView[] }>('/games/recent?limit=50');
      const active = data.games.filter((g) => {
        const status = getGameStatus(g);
        return status === GameStatus.Upcoming || status === GameStatus.Active;
      });
      setGames(active);
    } catch (e) {
      console.error('Failed to fetch games:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
    const interval = setInterval(fetch, 30000);
    return () => clearInterval(interval);
  }, [fetch]);

  return { games, loading, refetch: fetch };
}

export function useMyGames(walletAddress?: string) {
  const [games, setGames] = useState<GameView[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!walletAddress) {
      setLoading(false);
      return;
    }
    try {
      const data = await api<{ games: GameView[] }>(`/games/joined?user=${walletAddress}&limit=50`);
      setGames(data.games);
    } catch (e) {
      console.error('Failed to fetch my games:', e);
    } finally {
      setLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    fetch();
    const interval = setInterval(fetch, 30000);
    return () => clearInterval(interval);
  }, [fetch]);

  return { games, loading, refetch: fetch };
}
