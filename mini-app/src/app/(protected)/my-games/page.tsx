'use client';

import { TopBar } from '@worldcoin/mini-apps-ui-kit-react';
import { Group } from 'iconoir-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { type GameView, GameStatus, getGameStatus, formatWipBalance } from '@/types';
import { useMyGames } from '@/hooks/useGames';
import { CountdownTimer } from '@/components/CountdownTimer';
import { SkeletonList } from '@/components/Skeleton';
import { UsdcBalance } from '@/components/UsdcBalance';
import { haptic } from '@/lib/haptics';
import { Page } from '@/components/PageLayout';

function MyGameCard({ game, onClick }: { game: GameView; onClick: () => void }) {
  const status = getGameStatus(game);
  const isActive = status === GameStatus.Active;
  const isEnded = status === GameStatus.Ended;
  const isUpcoming = status === GameStatus.Upcoming;
  const entryAmount = formatWipBalance(game.entryAmount);

  return (
    <button
      onClick={onClick}
      className="w-full overflow-hidden rounded-3xl text-left active:scale-[0.98] transition-all duration-150"
      style={{ backgroundColor: '#1c1c24' }}
    >
      <div className="p-5 pb-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-extrabold" style={{ color: '#ffffff' }}>{game.name || `Game #${game.id}`}</h3>
          <div className="flex items-center gap-1.5">
            <div
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: isActive ? '#34c759' : isEnded ? '#6a6a7a' : '#f59e0b' }}
            />
            <span className="text-sm font-semibold" style={{ color: isActive ? '#34c759' : isEnded ? '#6a6a7a' : '#f59e0b' }}>
              {isActive ? 'Live' : isEnded ? 'Ended' : 'Soon'}
            </span>
          </div>
        </div>

        <div className="mt-2 flex items-center gap-5 text-sm" style={{ color: '#9898aa' }}>
          <span className="flex items-center gap-1.5">
            <Image src="/usd-coin-usdc-logo.svg" alt="USDC" width={14} height={14} />
            <strong style={{ color: '#ffffff' }}>{entryAmount}</strong> USDC
          </span>
          <span className="flex items-center gap-1.5">
            <Group width={14} height={14} />
            <strong style={{ color: '#ffffff' }}>{game.playerCount}</strong>/{game.maxPlayers}
          </span>
        </div>
      </div>

      <div
        className="flex items-center justify-between px-5 py-3"
        style={{ backgroundColor: '#24242e' }}
      >
        {isActive && <CountdownTimer targetTime={Number(game.endTime) * 1000} label="Ends in" />}
        {isUpcoming && <CountdownTimer targetTime={Number(game.startTime) * 1000} label="Starts in" />}
        {isEnded && <span className="text-sm" style={{ color: '#6a6a7a' }}>Finished</span>}
        <span className="text-sm font-bold" style={{ color: '#ffffff' }}>
          ${formatWipBalance(game.startingWIPBalance).toLocaleString()}
        </span>
      </div>
    </button>
  );
}

export default function MyGamesPage() {
  const router = useRouter();
  const session = useSession();
  const walletAddress = session?.data?.user?.walletAddress;
  const { games, loading } = useMyGames(walletAddress);
  const [filter, setFilter] = useState<'active' | 'ended'>('active');

  const filtered = games.filter((g) => {
    const status = getGameStatus(g);
    return filter === 'active'
      ? status === GameStatus.Active || status === GameStatus.Upcoming
      : status === GameStatus.Ended;
  });

  return (
    <>
      <Page.Main>
        <TopBar title="My Games" endAdornment={<UsdcBalance />} />
        <div className="mb-4" />

        <div
          className="relative mb-5 flex overflow-hidden rounded-full"
          style={{ backgroundColor: '#24242e', height: '52px' }}
        >
          <div
            className="absolute top-0 left-0 h-full w-1/2 rounded-full transition-transform duration-300 ease-out"
            style={{
              backgroundColor: '#2470ff',
              transform: filter === 'ended' ? 'translateX(100%)' : 'translateX(0)',
            }}
          />
          <button
            onClick={() => { setFilter('active'); haptic.selection(); }}
            className="relative z-10 flex-1 text-[15px] font-bold"
            style={{ color: filter === 'active' ? '#ffffff' : '#6a6a7a' }}
          >
            Active
          </button>
          <button
            onClick={() => { setFilter('ended'); haptic.selection(); }}
            className="relative z-10 flex-1 text-[15px] font-bold"
            style={{ color: filter === 'ended' ? '#ffffff' : '#6a6a7a' }}
          >
            Ended
          </button>
        </div>

        {loading ? (
          <SkeletonList count={3} />
        ) : (
          <div className="space-y-3 animate-fade-in">
            {filtered.map((game) => (
              <MyGameCard
                key={game.id}
                game={game}
                onClick={() => { router.push(`/my-games/${game.id}`); haptic.light(); }}
              />
            ))}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <p className="py-12 text-center text-sm" style={{ color: '#9898aa' }}>
            {filter === 'active' ? 'No active games' : 'No finished games'}
          </p>
        )}
      </Page.Main>
    </>
  );
}
