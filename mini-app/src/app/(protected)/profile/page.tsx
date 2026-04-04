'use client';

import { Marble, TopBar, VerificationBadge } from '@worldcoin/mini-apps-ui-kit-react';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { GameStatus, getGameStatus, formatWipBalance } from '@/types';
import { useMyGames } from '@/hooks/useGames';
import { UsdcBalance } from '@/components/UsdcBalance';
import { LoadingSpinner } from '@/components/LoadingState';
import { Page } from '@/components/PageLayout';

export default function ProfilePage() {
  const router = useRouter();
  const session = useSession();
  const walletAddress = session?.data?.user?.walletAddress;
  const username = session?.data?.user?.username || 'Anonymous';
  const profilePic = session?.data?.user?.profilePictureUrl || '';
  const { games, loading } = useMyGames(walletAddress);

  const endedGames = games.filter((g) => getGameStatus(g) === GameStatus.Ended);
  const gamesPlayed = games.length;
  // Win rate would need ranking data per game — for now show games count

  return (
    <>
      <Page.Main>
        <TopBar title="Profile" endAdornment={<UsdcBalance />} />
        <div className="mb-4" />

        {/* Avatar */}
        <div className="flex flex-col items-center gap-2 mb-8">
          <Marble src={profilePic} alt={username} className="h-20 w-20" />
          <div className="flex items-center gap-2">
            <span className="text-xl font-extrabold" style={{ color: '#ffffff' }}>{username}</span>
            <VerificationBadge verified={true} />
          </div>
          {walletAddress && (
            <span className="text-sm" style={{ color: '#6a6a7a' }}>
              {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
            </span>
          )}
        </div>

        {/* Stats */}
        <div className="mb-8 flex justify-around px-2">
          <div className="text-center">
            <div className="text-2xl font-extrabold" style={{ color: '#ffffff' }}>{gamesPlayed}</div>
            <div className="text-xs" style={{ color: '#6a6a7a' }}>Games</div>
          </div>
          <div style={{ width: '1px', backgroundColor: '#24242e' }} />
          <div className="text-center">
            <div className="text-2xl font-extrabold" style={{ color: '#ffffff' }}>{endedGames.length}</div>
            <div className="text-xs" style={{ color: '#6a6a7a' }}>Completed</div>
          </div>
        </div>

        <div style={{ height: '1px', backgroundColor: '#24242e' }} className="mb-5" />

        {/* Game history */}
        <div className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: '#6a6a7a' }}>Games</div>
        {loading ? (
          <LoadingSpinner label="Loading..." />
        ) : games.length > 0 ? (
          <div className="space-y-2">
            {games.map((game) => {
              const status = getGameStatus(game);
              const isEnded = status === GameStatus.Ended;
              const entryAmount = formatWipBalance(game.entryAmount);

              return (
                <button
                  key={game.id}
                  onClick={() => router.push(`/my-games/${game.id}`)}
                  className="flex w-full items-center justify-between rounded-2xl active:scale-[0.98] transition-all"
                  style={{ backgroundColor: '#1c1c24', padding: '16px' }}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold"
                      style={{
                        backgroundColor: isEnded ? '#24242e' : '#2470ff20',
                        color: isEnded ? '#6a6a7a' : '#2470ff',
                      }}
                    >
                      #{game.id}
                    </span>
                    <div className="text-left">
                      <div className="text-[15px] font-bold" style={{ color: '#ffffff' }}>Game #{game.id}</div>
                      <div className="text-xs" style={{ color: '#9898aa' }}>
                        {game.playerCount} players · {entryAmount} USDC
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-semibold" style={{
                      color: status === GameStatus.Active ? '#34c759' : status === GameStatus.Upcoming ? '#f59e0b' : '#6a6a7a'
                    }}>
                      {status === GameStatus.Active ? 'Live' : status === GameStatus.Upcoming ? 'Soon' : 'Ended'}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="py-8 text-center text-sm" style={{ color: '#6a6a7a' }}>No games yet</p>
        )}
      </Page.Main>
    </>
  );
}
