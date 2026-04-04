'use client';

import { Marble, TopBar, VerificationBadge } from '@worldcoin/mini-apps-ui-kit-react';
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

        {/* Avatar */}
        <div className="flex flex-col items-center gap-2 mb-8">
          <Marble src={profilePic} alt={username} className="h-20 w-20" />
          <div className="flex items-center gap-2">
            <span className="text-xl font-extrabold" style={{ color: '#111' }}>{username}</span>
            <VerificationBadge verified={true} />
          </div>
          <span className="text-sm" style={{ color: '#aaa' }}>
            {walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : ''}
          </span>
        </div>

        {/* Earnings */}
        <div className="mb-8 text-center">
          <div className="text-sm font-semibold uppercase tracking-wider mb-1" style={{ color: '#bbb' }}>Earnings</div>
          <div className="text-4xl font-extrabold" style={{ color: '#111' }}>${user.totalEarnings}</div>
          <div className="text-sm" style={{ color: '#aaa' }}>USDC</div>
        </div>

        {/* Stats */}
        <div className="mb-8 flex justify-between px-2">
          <div className="text-center">
            <div className="text-2xl font-extrabold" style={{ color: '#111' }}>{user.gamesPlayed}</div>
            <div className="text-xs" style={{ color: '#aaa' }}>Games</div>
          </div>
          <div style={{ width: '1px', backgroundColor: '#eee' }} />
          <div className="text-center">
            <div className="text-2xl font-extrabold" style={{ color: user.winRate >= 50 ? '#16a34a' : '#ef4444' }}>{user.winRate}%</div>
            <div className="text-xs" style={{ color: '#aaa' }}>Win Rate</div>
          </div>
          <div style={{ width: '1px', backgroundColor: '#eee' }} />
          <div className="text-center">
            <div className="text-2xl font-extrabold" style={{ color: '#16a34a' }}>+{user.bestReturn}%</div>
            <div className="text-xs" style={{ color: '#aaa' }}>Best</div>
          </div>
        </div>

        {/* Separator */}
        <div style={{ height: '1px', backgroundColor: '#f0f0f0' }} className="mb-5" />

        {/* History */}
        <div className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: '#bbb' }}>History</div>
        <div className="space-y-2">
          {user.gameHistory.map((entry) => {
            const isWin = entry.rank <= Math.ceil(entry.totalPlayers / 2);
            return (
              <button
                key={entry.gameId}
                onClick={() => router.push(`/my-games/${entry.gameId}`)}
                className="flex w-full items-center justify-between rounded-2xl active:scale-[0.98] transition-all"
                style={{ backgroundColor: '#f7f7f7', padding: '16px' }}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold"
                    style={{
                      backgroundColor: isWin ? '#f0fdf4' : '#fef2f2',
                      color: isWin ? '#16a34a' : '#ef4444',
                    }}
                  >
                    #{entry.rank}
                  </span>
                  <div className="text-left">
                    <div className="text-[15px] font-bold" style={{ color: '#111' }}>{entry.gameName}</div>
                    <div className="text-xs" style={{ color: '#aaa' }}>
                      {entry.totalPlayers} players · {new Date(entry.endedAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div
                    className="text-[15px] font-bold"
                    style={{ color: entry.pnlPercent >= 0 ? '#16a34a' : '#ef4444' }}
                  >
                    {entry.pnlPercent >= 0 ? '+' : ''}{entry.pnlPercent}%
                  </div>
                  {entry.payout > 0 && (
                    <div className="text-xs font-semibold" style={{ color: '#16a34a' }}>+${entry.payout}</div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </Page.Main>
    </>
  );
}
