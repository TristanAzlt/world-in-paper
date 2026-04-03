'use client';

import { ListItem, Marble, TopBar, VerificationBadge } from '@worldcoin/mini-apps-ui-kit-react';
import { useRouter } from 'next/navigation';
import { MOCK_USER } from '@/lib/mock-data';
import { StatCard } from '@/components/StatCard';
import { Page } from '@/components/PageLayout';

export default function ProfilePage() {
  const router = useRouter();
  const user = MOCK_USER;

  return (
    <>
      <Page.Header>
        <TopBar title="Profile" />
      </Page.Header>

      <Page.Main className="pb-32">
        {/* User info */}
        <div className="mb-6 flex flex-col items-center gap-2">
          <Marble
            src={user.profilePictureUrl || ''}
            alt={user.username}
            className="h-16 w-16"
          />
          <div className="flex items-center gap-1.5">
            <span className="text-lg font-semibold text-gray-900">{user.username}</span>
            <VerificationBadge verified={true} />
          </div>
          <span className="text-sm text-gray-400">
            {user.address.slice(0, 6)}...{user.address.slice(-4)}
          </span>
        </div>

        {/* Stats grid */}
        <div className="mb-6 grid grid-cols-2 gap-2">
          <StatCard label="Games Played" value={user.gamesPlayed.toString()} />
          <StatCard
            label="Win Rate"
            value={`${user.winRate}%`}
            variant={user.winRate >= 50 ? 'positive' : 'negative'}
          />
          <StatCard
            label="Avg Return"
            value={`${user.avgReturn >= 0 ? '+' : ''}${user.avgReturn}%`}
            variant={user.avgReturn >= 0 ? 'positive' : 'negative'}
          />
          <StatCard
            label="Best Return"
            value={`+${user.bestReturn}%`}
            variant="positive"
          />
        </div>

        {/* Earnings */}
        <div className="mb-6 rounded-2xl bg-gray-50 p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">
            ${user.totalEarnings.toLocaleString()} USDC
          </div>
          <div className="text-sm text-gray-500">Total Earnings</div>
        </div>

        {/* Game history */}
        <section>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">
            History
          </h3>
          <div className="space-y-1">
            {user.gameHistory.map((entry) => {
              return (
                <ListItem
                  key={entry.gameId}
                  onClick={() => router.push(`/my-games/${entry.gameId}`)}
                  label={entry.gameName}
                  description={`#${entry.rank} of ${entry.totalPlayers} · ${new Date(entry.endedAt).toLocaleDateString()}`}
                  endAdornment={
                    <div className="text-right">
                      <div className={`text-sm font-medium ${entry.pnlPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {entry.pnlPercent >= 0 ? '+' : ''}{entry.pnlPercent}%
                      </div>
                      {entry.payout > 0 && (
                        <div className="text-xs text-gray-400">${entry.payout} USDC</div>
                      )}
                    </div>
                  }
                />
              );
            })}
          </div>
        </section>
      </Page.Main>
    </>
  );
}
