'use client';

import { Drawer, DrawerContent, DrawerTitle, TopBar } from '@worldcoin/mini-apps-ui-kit-react';
import * as VisuallyHidden from '@radix-ui/react-visually-hidden';
import { Plus, Group } from 'iconoir-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { type GameView, GameStatus, getGameStatus, formatWipBalance } from '@/types';
import { useExploreGames, useMyGames } from '@/hooks/useGames';
import { useSession } from 'next-auth/react';
import { useContract } from '@/hooks/useContract';
import { CountdownTimer } from '@/components/CountdownTimer';
import { SkeletonList } from '@/components/Skeleton';
import { UsdcBalance } from '@/components/UsdcBalance';
import { haptic } from '@/lib/haptics';
import { getWorldIdProof } from '@/lib/worldid';
import { Page } from '@/components/PageLayout';

function ExploreCard({ game, onClick }: { game: GameView; onClick: () => void }) {
  const status = getGameStatus(game);
  const isActive = status === GameStatus.Active;
  const entryAmount = formatWipBalance(game.entryAmount);
  const startingCapital = formatWipBalance(game.startingWIPBalance);

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
              style={{ backgroundColor: isActive ? '#34c759' : '#f59e0b' }}
            />
            <span className="text-sm font-semibold" style={{ color: isActive ? '#34c759' : '#f59e0b' }}>
              {isActive ? 'Live' : 'Upcoming'}
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
        <CountdownTimer
          targetTime={isActive ? Number(game.endTime) * 1000 : Number(game.startTime) * 1000}
          label={isActive ? 'Ends in' : 'Starts in'}
        />
        <span className="text-sm font-bold" style={{ color: '#ffffff' }}>
          ${startingCapital.toLocaleString()}
        </span>
      </div>
    </button>
  );
}

export default function ExplorePage() {
  const router = useRouter();
  const session = useSession();
  const walletAddress = session?.data?.user?.walletAddress;
  const { games, loading } = useExploreGames();
  const { games: myGames } = useMyGames(walletAddress);
  const { joinGame } = useContract();
  const [joinTarget, setJoinTarget] = useState<GameView | null>(null);
  const [joining, setJoining] = useState(false);

  const myGameIds = new Set(myGames.map((g) => g.id));

  const handleJoin = async () => {
    if (!joinTarget) return;
    haptic.medium();
    try {
      const worldIdProof = await getWorldIdProof('join-game', '');

      setJoining(true);
      const result = await joinGame(BigInt(joinTarget.id), BigInt(joinTarget.entryAmount), worldIdProof);
      if (result?.data?.userOpHash) {
        haptic.success();
        router.push(`/my-games/${joinTarget.id}`);
      }
    } catch (e) {
      console.error('Join failed:', e);
      haptic.error();
    } finally {
      setJoining(false);
      setJoinTarget(null);
    }
  };

  const entryAmount = joinTarget ? formatWipBalance(joinTarget.entryAmount) : 0;
  const startingCapital = joinTarget ? formatWipBalance(joinTarget.startingWIPBalance) : 0;

  return (
    <>
      <Page.Main className="relative">
        <TopBar title="Explore" endAdornment={<UsdcBalance />} />
        <div className="mb-4" />

        {/* Info carousel */}
        <div
          className="flex gap-3 overflow-x-auto pb-1 mb-5 -mr-6 pr-6"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}
        >
          {[
            {
              title: 'Trade Anything',
              desc: 'Crypto, stocks, commodities — trade across all chains in one place.',
              bg: 'linear-gradient(135deg, #0d1b3e 0%, #1a2f5e 50%, #0f1f4a 100%)',
              border: '#1e3a6e',
              content: (
                <div className="flex -space-x-2 mt-4">
                  <img src="https://app.hyperliquid.xyz/coins/BTC.svg" className="h-9 w-9 rounded-full" style={{ border: '2px solid #1a2f5e' }} alt="" />
                  <img src="/ethereum-eth.svg" className="h-9 w-9 rounded-full" style={{ border: '2px solid #1a2f5e' }} alt="" />
                  <img src="https://app.hyperliquid.xyz/coins/SOL.svg" className="h-9 w-9 rounded-full" style={{ border: '2px solid #1a2f5e' }} alt="" />
                  <img src="https://app.hyperliquid.xyz/coins/xyz:AAPL.svg" className="h-9 w-9 rounded-full" style={{ border: '2px solid #1a2f5e', backgroundColor: '#1a2f5e' }} alt="" />
                  <img src="https://app.hyperliquid.xyz/coins/xyz:TSLA.svg" className="h-9 w-9 rounded-full" style={{ border: '2px solid #1a2f5e', backgroundColor: '#1a2f5e' }} alt="" />
                  <img src="https://app.hyperliquid.xyz/coins/xyz:GOLD.svg" className="h-9 w-9 rounded-full" style={{ border: '2px solid #1a2f5e', backgroundColor: '#1a2f5e' }} alt="" />
                </div>
              ),
            },
            {
              title: 'Win 2x Your Buy-in',
              desc: 'Top 50% doubles their entry. Compete with real market prices, virtual portfolio.',
              bg: 'linear-gradient(135deg, #0d1b3e 0%, #162d55 50%, #0f1f4a 100%)',
              border: '#1e3a6e',
              content: (
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-3xl font-black" style={{ color: '#ffffff' }}>2x</span>
                  <span className="text-sm font-bold" style={{ color: '#9898aa' }}>payout for winners</span>
                </div>
              ),
            },
            {
              title: 'Zero Risk',
              desc: 'Paper trade with real prices. Only your USDC buy-in is at stake — not your portfolio.',
              bg: 'linear-gradient(135deg, #0d1530 0%, #1a2545 50%, #0f1835 100%)',
              border: '#1e3060',
              content: (
                <div className="mt-4 flex items-center gap-2">
                  <Image src="/usd-coin-usdc-logo.svg" alt="" width={24} height={24} style={{ opacity: 0.4 }} />
                  <span className="text-sm font-bold" style={{ color: '#9898aa' }}>Virtual Portfolio</span>
                </div>
              ),
            },
          ].map((card, i) => (
            <div
              key={i}
              className="flex-shrink-0 rounded-3xl overflow-hidden"
              style={{ background: card.bg, width: 'calc(80%)', scrollSnapAlign: 'start', border: `1px solid ${card.border}` }}
            >
              <div className="p-5" style={{ minHeight: '150px' }}>
                <h3 className="text-[15px] font-extrabold tracking-tight" style={{ color: '#fff' }}>{card.title}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed" style={{ color: '#9898bb' }}>{card.desc}</p>
                {card.content}
              </div>
            </div>
          ))}
        </div>

        {loading ? (
          <SkeletonList count={3} />
        ) : (
          <div className="space-y-3 animate-fade-in">
            {games.map((game) => (
              <ExploreCard
                key={game.id}
                game={game}
                onClick={() => {
                  haptic.light();
                  if (myGameIds.has(game.id) || getGameStatus(game) === GameStatus.Active) {
                    router.push(`/my-games/${game.id}`);
                  } else {
                    setJoinTarget(game);
                  }
                }}
              />
            ))}
          </div>
        )}

        {!loading && games.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-base" style={{ color: '#9898aa' }}>No games available</p>
          </div>
        )}

        <div className="fixed bottom-28 right-5 z-10">
          <button
            onClick={() => { router.push('/games/create'); haptic.light(); }}
            className="flex items-center gap-2 rounded-full px-6 shadow-lg active:scale-90 transition-transform"
            style={{ backgroundColor: '#2470ff', color: '#ffffff', height: '56px' }}
          >
            <Plus width={20} height={20} strokeWidth={2.5} />
            <span className="text-base font-bold">New Game</span>
          </button>
        </div>
      </Page.Main>

      <Drawer open={!!joinTarget} onOpenChange={(open) => !open && setJoinTarget(null)} dismissible={true} height="fit">
        <DrawerContent>
          <VisuallyHidden.Root><DrawerTitle>Join Game</DrawerTitle></VisuallyHidden.Root>
          <div className="px-5 pt-6 pb-10">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-extrabold mb-2" style={{ color: '#ffffff' }}>
                {joinTarget?.name || `Game #${joinTarget?.id}`}
              </h2>
              <div className="flex items-center justify-center gap-4 text-sm" style={{ color: '#9898aa' }}>
                <span className="flex items-center gap-1.5">
                  <Group width={16} height={16} />
                  {joinTarget?.playerCount}/{joinTarget?.maxPlayers}
                </span>
                <span>${startingCapital.toLocaleString()} capital</span>
              </div>
            </div>

            <div className="rounded-2xl py-5 mb-6 text-center" style={{ backgroundColor: '#1c1c24' }}>
              <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#9898aa' }}>
                Buy-in
              </div>
              <div className="flex items-center justify-center gap-2">
                <Image src="/usd-coin-usdc-logo.svg" alt="USDC" width={28} height={28} />
                <span className="text-3xl font-extrabold" style={{ color: '#ffffff' }}>
                  {entryAmount}
                </span>
                <span className="text-lg font-bold" style={{ color: '#9898aa' }}>USDC</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setJoinTarget(null)}
                className="flex-1 rounded-2xl text-base font-bold active:scale-95 transition-transform"
                style={{ height: '56px', backgroundColor: '#24242e', color: '#9898aa' }}
              >
                Cancel
              </button>
              <button
                onClick={handleJoin}
                disabled={joining}
                className="flex-1 rounded-2xl text-base font-bold active:scale-95 transition-transform disabled:opacity-50"
                style={{ height: '56px', backgroundColor: '#2470ff', color: '#ffffff' }}
              >
                {joining ? 'Joining...' : 'Join Game'}
              </button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
