'use client';

import { TopBar } from '@worldcoin/mini-apps-ui-kit-react';
import { DollarCircle, Group } from 'iconoir-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { GameStatus, type Game, type Player } from '@/types';
import { getMyGames, getMyPlayer } from '@/lib/mock-data';
import { CountdownTimer } from '@/components/CountdownTimer';
import { UsdcBalance } from '@/components/UsdcBalance';
import { Page } from '@/components/PageLayout';

function MyGameCard({
  game,
  player,
  onClick,
}: {
  game: Game;
  player?: Player;
  onClick: () => void;
}) {
  const isActive = game.status === GameStatus.Active;
  const isEnded = game.status === GameStatus.Ended;
  const isUpcoming = game.status === GameStatus.Upcoming;
  const pnl = player?.pnlPercent ?? 0;

  return (
    <button
      onClick={onClick}
      className="w-full overflow-hidden rounded-3xl text-left active:scale-[0.98] transition-all duration-150"
      style={{ backgroundColor: '#f7f7f7' }}
    >
      <div className="p-5 pb-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-extrabold" style={{ color: '#111' }}>{game.name}</h3>
          <div className="flex items-center gap-1.5">
            <div
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: isActive ? '#16a34a' : isEnded ? '#ccc' : '#f59e0b' }}
            />
            <span className="text-sm font-semibold" style={{ color: isActive ? '#16a34a' : isEnded ? '#aaa' : '#f59e0b' }}>
              {isActive ? 'Live' : isEnded ? 'Ended' : 'Soon'}
            </span>
          </div>
        </div>

        <div className="mt-2 flex items-center gap-5 text-sm" style={{ color: '#999' }}>
          <span className="flex items-center gap-1.5">
            <DollarCircle width={14} height={14} />
            <strong style={{ color: '#111' }}>{game.entryAmount}</strong> USDC
          </span>
          <span className="flex items-center gap-1.5">
            <Group width={14} height={14} />
            <strong style={{ color: '#111' }}>{game.playerCount}</strong>/{game.maxPlayers}
          </span>
        </div>

        {player && (
          <div className="mt-3 flex items-center justify-between">
            <span
              className="text-lg font-extrabold"
              style={{ color: pnl >= 0 ? '#16a34a' : '#ef4444' }}
            >
              {pnl >= 0 ? '+' : ''}{pnl.toFixed(1)}%
            </span>
            <span className="text-sm font-semibold" style={{ color: '#aaa' }}>
              #{player.rank} of {game.playerCount}
            </span>
          </div>
        )}
      </div>

      <div
        className="flex items-center justify-between px-5 py-3"
        style={{ backgroundColor: '#efefef' }}
      >
        {isActive && <CountdownTimer targetTime={game.endTime} label="Ends in" />}
        {isUpcoming && <CountdownTimer targetTime={game.startTime} label="Starts in" />}
        {isEnded && <span className="text-sm" style={{ color: '#aaa' }}>Finished</span>}
        <span className="text-sm font-bold" style={{ color: '#111' }}>
          ${game.startingCapital.toLocaleString()}
        </span>
      </div>
    </button>
  );
}

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
        <TopBar title="My Games" endAdornment={<UsdcBalance balance={142.50} />} />
      </Page.Header>

      <Page.Main>
        <div
          className="relative mb-5 flex overflow-hidden rounded-full"
          style={{ backgroundColor: '#f0f0f0', height: '52px' }}
        >
          <div
            className="absolute top-0 left-0 h-full w-1/2 rounded-full transition-transform duration-300 ease-out"
            style={{
              backgroundColor: '#111',
              transform: filter === 'ended' ? 'translateX(100%)' : 'translateX(0)',
            }}
          />
          <button
            onClick={() => setFilter('active')}
            className="relative z-10 flex-1 text-[15px] font-bold"
            style={{ color: filter === 'active' ? '#fff' : '#999' }}
          >
            Active
          </button>
          <button
            onClick={() => setFilter('ended')}
            className="relative z-10 flex-1 text-[15px] font-bold"
            style={{ color: filter === 'ended' ? '#fff' : '#999' }}
          >
            Ended
          </button>
        </div>

        <div className="space-y-3">
          {filtered.map((game) => {
            const player = getMyPlayer(game);
            return (
              <MyGameCard
                key={game.id}
                game={game}
                player={player}
                onClick={() => router.push(`/my-games/${game.id}`)}
              />
            );
          })}
        </div>

        {filtered.length === 0 && (
          <p className="py-12 text-center text-sm" style={{ color: '#aaa' }}>
            {filter === 'active' ? 'No active games' : 'No finished games'}
          </p>
        )}
      </Page.Main>
    </>
  );
}
