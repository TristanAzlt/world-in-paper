'use client';

import { Marble, TopBar, VerificationBadge } from '@worldcoin/mini-apps-ui-kit-react';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { MOCK_USER } from '@/lib/mock-data';
import { UsdcBalance } from '@/components/UsdcBalance';
import { Page } from '@/components/PageLayout';

export default function ProfilePage() {
  const router = useRouter();
  const session = useSession();
  const user = MOCK_USER;

  const username = session?.data?.user?.username || user.username;
  const profilePic = session?.data?.user?.profilePictureUrl || user.profilePictureUrl || '';
  const walletAddress = session?.data?.user?.walletAddress || user.address;

  return (
    <>
      <Page.Main>
        <TopBar title="Profile" endAdornment={<UsdcBalance balance={142.50} />} />
        <div className="mb-4" />

        {/* Avatar */}
        <div className="flex flex-col items-center gap-2 mb-8">
          <Marble src={profilePic} alt={username} className="h-20 w-20" />
          <div className="flex items-center gap-2">
            <span className="text-xl font-extrabold" style={{ color: '#ffffff' }}>{username}</span>
            <VerificationBadge verified={true} />
          </div>
          <span className="text-sm" style={{ color: '#9898aa' }}>
            {walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : ''}
          </span>
        </div>

        {/* Earnings */}
        <div className="mb-8 text-center">
          <div className="text-sm font-semibold uppercase tracking-wider mb-1" style={{ color: '#6a6a7a' }}>Earnings</div>
          <div className="flex items-center justify-center gap-2">
            <Image src="/usd-coin-usdc-logo.svg" alt="USDC" width={28} height={28} />
            <span className="text-4xl font-extrabold" style={{ color: '#ffffff' }}>${user.totalEarnings}</span>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-8 flex justify-between px-2">
          <div className="text-center">
            <div className="text-2xl font-extrabold" style={{ color: '#ffffff' }}>{user.gamesPlayed}</div>
            <div className="text-xs" style={{ color: '#9898aa' }}>Games</div>
          </div>
          <div style={{ width: '1px', backgroundColor: '#24242e' }} />
          <div className="text-center">
            <div className="text-2xl font-extrabold" style={{ color: user.winRate >= 50 ? '#34c759' : '#ff6b6b' }}>{user.winRate}%</div>
            <div className="text-xs" style={{ color: '#9898aa' }}>Win Rate</div>
          </div>
          <div style={{ width: '1px', backgroundColor: '#24242e' }} />
          <div className="text-center">
            <div className="text-2xl font-extrabold" style={{ color: '#34c759' }}>+{user.bestReturn}%</div>
            <div className="text-xs" style={{ color: '#9898aa' }}>Best</div>
          </div>
        </div>

        {/* Separator */}
        <div style={{ height: '1px', backgroundColor: '#24242e' }} className="mb-5" />

        {/* History */}
        <div className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: '#6a6a7a' }}>History</div>
        <div className="space-y-2">
          {user.gameHistory.map((entry) => {
            const isWin = entry.rank <= Math.ceil(entry.totalPlayers / 2);
            return (
              <button
                key={entry.gameId}
                onClick={() => router.push(`/my-games/${entry.gameId}`)}
                className="flex w-full items-center justify-between rounded-2xl active:scale-[0.98] transition-all"
                style={{ backgroundColor: '#1c1c24', padding: '16px' }}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold"
                    style={{
                      backgroundColor: isWin ? '#34c75920' : '#ff6b6b20',
                      color: isWin ? '#34c759' : '#ff6b6b',
                    }}
                  >
                    {isWin ? 'W' : 'L'}
                  </span>
                  <div className="text-left">
                    <div className="text-[15px] font-bold" style={{ color: '#ffffff' }}>{entry.gameName}</div>
                    <div className="text-xs" style={{ color: '#9898aa' }}>
                      {entry.totalPlayers} players · {new Date(entry.endedAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[15px] font-bold" style={{ color: '#ffffff' }}>
                    {isWin ? `+$${entry.payout}` : `-$${entry.payout || 10}`}
                  </span>
                  <Image src="/usd-coin-usdc-logo.svg" alt="USDC" width={16} height={16} />
                </div>
              </button>
            );
          })}
        </div>
      </Page.Main>
    </>
  );
}
