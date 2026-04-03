'use client';

import { TopBar } from '@worldcoin/mini-apps-ui-kit-react';
import { NavArrowLeft, Plus, GraphUp, Medal, Wallet } from 'iconoir-react';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { GameStatus } from '@/types';
import { MOCK_GAMES, MOCK_POSITIONS, MOCK_CURRENT_ADDRESS } from '@/lib/mock-data';
import { CountdownTimer } from '@/components/CountdownTimer';
import { LeaderboardRow } from '@/components/LeaderboardRow';
import { PositionRow } from '@/components/PositionRow';
import { TradeDrawer } from '@/components/TradeDrawer';
import { Page } from '@/components/PageLayout';

export default function GameViewPage() {
  const params = useParams();
  const router = useRouter();
  const [tradeOpen, setTradeOpen] = useState(false);

  const game = MOCK_GAMES.find((g) => g.id === params.id);
  if (!game) {
    return (
      <Page.Main>
        <p className="py-12 text-center" style={{ color: '#999' }}>Game not found</p>
      </Page.Main>
    );
  }

  const currentPlayer = game.players.find((p) => p.address === MOCK_CURRENT_ADDRESS);
  const positions = MOCK_POSITIONS[game.id] || [];
  const isActive = game.status === GameStatus.Active;
  const pnl = currentPlayer?.pnlPercent ?? 0;
  const isPositive = pnl >= 0;

  return (
    <>
      <Page.Header>
        <TopBar
          startAdornment={
            <button onClick={() => router.back()} className="p-2 -ml-2 active:opacity-60">
              <NavArrowLeft width={22} height={22} />
            </button>
          }
          title={game.name}
          endAdornment={
            isActive ? (
              <CountdownTimer targetTime={game.endTime} />
            ) : game.status === GameStatus.Upcoming ? (
              <CountdownTimer targetTime={game.startTime} label="Starts" />
            ) : null
          }
        />
      </Page.Header>

      <Page.Main className="pb-36">
        {/* Hero Stats */}
        <div className="mb-6 rounded-2xl p-5" style={{ backgroundColor: '#f7f7f7' }}>
          <div className="mb-4 text-center">
            <div
              className="text-3xl font-bold"
              style={{ color: isPositive ? '#16a34a' : '#ef4444' }}
            >
              {isPositive ? '+' : ''}{pnl.toFixed(1)}%
            </div>
            <div className="mt-1 text-sm" style={{ color: '#888' }}>
              ${currentPlayer?.portfolioValue.toLocaleString() ?? game.startingCapital.toLocaleString()}
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex flex-1 items-center gap-2 rounded-xl p-3" style={{ backgroundColor: '#ffffff' }}>
              <Medal width={18} height={18} style={{ color: '#888' }} />
              <div>
                <div className="text-lg font-bold" style={{ color: '#111' }}>#{currentPlayer?.rank ?? '-'}</div>
                <div className="text-xs" style={{ color: '#999' }}>Rank</div>
              </div>
            </div>
            <div className="flex flex-1 items-center gap-2 rounded-xl p-3" style={{ backgroundColor: '#ffffff' }}>
              <Wallet width={18} height={18} style={{ color: '#888' }} />
              <div>
                <div className="text-lg font-bold" style={{ color: '#111' }}>${(game.entryAmount * game.playerCount)}</div>
                <div className="text-xs" style={{ color: '#999' }}>Pot</div>
              </div>
            </div>
          </div>
        </div>

        {/* Positions */}
        <section className="mb-6">
          <div className="mb-3 flex items-center gap-2">
            <GraphUp width={16} height={16} style={{ color: '#999' }} />
            <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: '#999' }}>
              Positions
            </h3>
          </div>
          {positions.length > 0 ? (
            <div className="rounded-2xl" style={{ backgroundColor: '#f7f7f7' }}>
              {positions.map((pos) => (
                <PositionRow key={pos.id} position={pos} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl py-8 text-center" style={{ backgroundColor: '#f7f7f7' }}>
              <p className="text-sm" style={{ color: '#999' }}>No open positions yet</p>
              <p className="mt-1 text-xs" style={{ color: '#bbb' }}>Tap Trade to get started</p>
            </div>
          )}
        </section>

        {/* Leaderboard */}
        <section className="mb-6">
          <div className="mb-3 flex items-center gap-2">
            <Medal width={16} height={16} style={{ color: '#999' }} />
            <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: '#999' }}>
              Leaderboard
            </h3>
          </div>
          <div className="rounded-2xl" style={{ backgroundColor: '#f7f7f7' }}>
            {game.players
              .sort((a, b) => a.rank - b.rank)
              .slice(0, 5)
              .map((player) => (
                <LeaderboardRow
                  key={player.address}
                  player={player}
                  isCurrentUser={player.address === MOCK_CURRENT_ADDRESS}
                />
              ))}
          </div>
        </section>

        {/* Trade FAB */}
        {isActive && (
          <div className="fixed bottom-28 right-5 z-10">
            <button
              onClick={() => setTradeOpen(true)}
              className="flex h-14 items-center gap-2 rounded-full px-6 shadow-lg active:scale-95 transition-transform"
              style={{ backgroundColor: '#111111', color: '#ffffff' }}
            >
              <Plus width={20} height={20} />
              <span className="text-[15px] font-semibold">Trade</span>
            </button>
          </div>
        )}
      </Page.Main>

      <TradeDrawer
        isOpen={tradeOpen}
        onClose={() => setTradeOpen(false)}
        availableBalance={currentPlayer?.portfolioValue ?? game.startingCapital}
      />
    </>
  );
}
