'use client';

import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@worldcoin/mini-apps-ui-kit-react';
import { Plus, DollarCircle, Group } from 'iconoir-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { Game } from '@/types';
import { getExploreGames } from '@/lib/mock-data';
import { GameCard } from '@/components/GameCard';
import { Page } from '@/components/PageLayout';

export default function ExplorePage() {
  const router = useRouter();
  const games = getExploreGames();
  const [joinTarget, setJoinTarget] = useState<Game | null>(null);

  const handleJoin = () => {
    if (joinTarget) {
      router.push(`/my-games/${joinTarget.id}`);
      setJoinTarget(null);
    }
  };

  return (
    <>
      <Page.Header>
        <div className="px-4 pt-4 pb-2">
          <h1 className="text-2xl font-bold" style={{ color: '#111' }}>Explore</h1>
          <p className="mt-1 text-sm" style={{ color: '#888' }}>Join a game and start trading</p>
        </div>
      </Page.Header>

      <Page.Main className="relative pb-36">
        <div className="space-y-3">
          {games.map((game) => (
            <GameCard
              key={game.id}
              game={game}
              onClick={() => setJoinTarget(game)}
            />
          ))}
        </div>

        {games.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-base" style={{ color: '#999' }}>No games available</p>
            <p className="mt-1 text-sm" style={{ color: '#bbb' }}>Create one to get started</p>
          </div>
        )}

        {/* Create FAB */}
        <div className="fixed bottom-28 right-5 z-10">
          <button
            onClick={() => router.push('/games/create')}
            className="flex h-14 w-14 items-center justify-center rounded-full shadow-lg active:scale-90 transition-transform"
            style={{ backgroundColor: '#111', color: '#fff' }}
          >
            <Plus width={24} height={24} strokeWidth={2} />
          </button>
        </div>
      </Page.Main>

      {/* Join dialog */}
      <AlertDialog open={!!joinTarget} onOpenChange={(open) => !open && setJoinTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Join {joinTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              <div className="mt-3 flex gap-4 text-sm" style={{ color: '#666' }}>
                <span className="flex items-center gap-1">
                  <DollarCircle width={16} height={16} />
                  {joinTarget?.entryAmount} USDC buy-in
                </span>
                <span className="flex items-center gap-1">
                  <Group width={16} height={16} />
                  {joinTarget?.playerCount}/{joinTarget?.maxPlayers} players
                </span>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose asChild>
              <button
                className="flex-1 rounded-2xl py-4 text-base font-semibold active:scale-95 transition-transform"
                style={{ backgroundColor: '#f0f0f0', color: '#555' }}
              >
                Cancel
              </button>
            </AlertDialogClose>
            <button
              onClick={handleJoin}
              className="flex-1 rounded-2xl py-4 text-base font-semibold active:scale-95 transition-transform"
              style={{ backgroundColor: '#111', color: '#fff' }}
            >
              Join Game
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
