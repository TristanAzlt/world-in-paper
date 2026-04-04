'use client';

import { Drawer, DrawerContent, TopBar } from '@worldcoin/mini-apps-ui-kit-react';
import { Plus, DollarCircle, Group } from 'iconoir-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { Game } from '@/types';
import { getExploreGames } from '@/lib/mock-data';
import { CountdownTimer } from '@/components/CountdownTimer';
import { UsdcBalance } from '@/components/UsdcBalance';
import { haptic } from '@/lib/haptics';
import { Page } from '@/components/PageLayout';

function ExploreCard({ game, onClick }: { game: Game; onClick: () => void }) {
  const isActive = game.status === 'active';

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
              style={{ backgroundColor: isActive ? '#16a34a' : '#f59e0b' }}
            />
            <span className="text-sm font-semibold" style={{ color: isActive ? '#16a34a' : '#f59e0b' }}>
              {isActive ? 'Live' : 'Upcoming'}
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
      </div>

      <div
        className="flex items-center justify-between px-5 py-3"
        style={{ backgroundColor: '#efefef' }}
      >
        <CountdownTimer
          targetTime={isActive ? game.endTime : game.startTime}
          label={isActive ? 'Ends in' : 'Starts in'}
        />
        <span className="text-sm font-bold" style={{ color: '#111' }}>
          ${game.startingCapital.toLocaleString()}
        </span>
      </div>
    </button>
  );
}

export default function ExplorePage() {
  const router = useRouter();
  const games = getExploreGames();
  const [joinTarget, setJoinTarget] = useState<Game | null>(null);

  const handleJoin = () => {
    if (joinTarget) {
      haptic.medium();
      router.push(`/my-games/${joinTarget.id}`);
      setJoinTarget(null);
    }
  };

  return (
    <>
      <Page.Header>
        <TopBar title="Explore" endAdornment={<UsdcBalance balance={142.50} />} />
      </Page.Header>

      <Page.Main className="relative">
        <div className="space-y-3">
          {games.map((game) => (
            <ExploreCard
              key={game.id}
              game={game}
              onClick={() => { setJoinTarget(game); haptic.light(); }}
            />
          ))}
        </div>

        {games.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-base" style={{ color: '#999' }}>No games available</p>
          </div>
        )}

        <div className="fixed bottom-28 right-5 z-10">
          <button
            onClick={() => { router.push('/games/create'); haptic.light(); }}
            className="flex items-center gap-2 rounded-full px-6 shadow-lg active:scale-90 transition-transform"
            style={{ backgroundColor: '#111', color: '#fff', height: '56px' }}
          >
            <Plus width={20} height={20} strokeWidth={2.5} />
            <span className="text-base font-bold">New Game</span>
          </button>
        </div>
      </Page.Main>

      {/* Join drawer */}
      <Drawer open={!!joinTarget} onOpenChange={(open) => !open && setJoinTarget(null)} dismissible={true} height="fit">
        <DrawerContent>
          <div className="px-5 pt-2 pb-10">
            {/* Game info */}
            <div className="text-center mb-6">
              <h2 className="text-2xl font-extrabold mb-2" style={{ color: '#111' }}>
                {joinTarget?.name}
              </h2>
              <div className="flex items-center justify-center gap-4 text-sm" style={{ color: '#999' }}>
                <span className="flex items-center gap-1.5">
                  <Group width={16} height={16} />
                  {joinTarget?.playerCount}/{joinTarget?.maxPlayers}
                </span>
                <span>${joinTarget?.startingCapital.toLocaleString()} capital</span>
              </div>
            </div>

            {/* Buy-in display */}
            <div className="rounded-2xl py-5 mb-6 text-center" style={{ backgroundColor: '#f7f7f7' }}>
              <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#aaa' }}>
                Buy-in
              </div>
              <div className="flex items-center justify-center gap-2">
                <Image src="/usd-coin-usdc-logo.svg" alt="USDC" width={28} height={28} />
                <span className="text-3xl font-extrabold" style={{ color: '#111' }}>
                  {joinTarget?.entryAmount}
                </span>
                <span className="text-lg font-bold" style={{ color: '#aaa' }}>USDC</span>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setJoinTarget(null)}
                className="flex-1 rounded-2xl text-base font-bold active:scale-95 transition-transform"
                style={{ height: '56px', backgroundColor: '#f0f0f0', color: '#555' }}
              >
                Cancel
              </button>
              <button
                onClick={handleJoin}
                className="flex-1 rounded-2xl text-base font-bold active:scale-95 transition-transform"
                style={{ height: '56px', backgroundColor: '#111', color: '#fff' }}
              >
                Join Game
              </button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
