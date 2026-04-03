'use client';

import { TopBar } from '@worldcoin/mini-apps-ui-kit-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { GameStatus } from '@/types';
import { getMyGames, getMyPlayer } from '@/lib/mock-data';
import { GameCard } from '@/components/GameCard';
import { Page } from '@/components/PageLayout';

export default function MyGamesPage() {
  const router = useRouter();
  const [filter, setFilter] = useState<'active' | 'ended'>('active');
  const myGames = getMyGames();

  const filtered = myGames.filter((g) =>
    filter === 'active'
      ? g.status === GameStatus.Active || g.status === GameStatus.Upcoming
      : g.status === GameStatus.Ended,
  );

  return (
    <>
      <Page.Header>
        <TopBar title="My Games" />
      </Page.Header>

      <Page.Main className="pb-32">
        <div
          className="relative mb-5 flex h-14 rounded-full"
          style={{ backgroundColor: '#f0f0f0' }}
        >
          <div
            className="absolute top-0 left-0 h-full w-1/2 rounded-full transition-transform duration-300 ease-out"
            style={{
              backgroundColor: '#111111',
              transform: filter === 'ended' ? 'translateX(100%)' : 'translateX(0)',
            }}
          />
          <button
            onClick={() => setFilter('active')}
            className="relative z-10 flex-1 text-base font-semibold"
            style={{ color: filter === 'active' ? '#ffffff' : '#999999' }}
          >
            Active
          </button>
          <button
            onClick={() => setFilter('ended')}
            className="relative z-10 flex-1 text-base font-semibold"
            style={{ color: filter === 'ended' ? '#ffffff' : '#999999' }}
          >
            Ended
          </button>
        </div>

        <div className="space-y-3">
          {filtered.map((game) => {
            const player = getMyPlayer(game);
            return (
              <GameCard
                key={game.id}
                game={game}
                userPnlPercent={player?.pnlPercent}
                userRank={player?.rank}
                onClick={() => router.push(`/my-games/${game.id}`)}
              />
            );
          })}
        </div>

        {filtered.length === 0 && (
          <p className="py-12 text-center text-sm text-gray-400">
            {filter === 'active' ? 'No active games' : 'No finished games'}
          </p>
        )}
      </Page.Main>
    </>
  );
}
