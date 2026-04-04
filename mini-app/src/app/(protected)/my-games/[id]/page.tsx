'use client';

import { TopBar } from '@worldcoin/mini-apps-ui-kit-react';
import { NavArrowLeft, Plus, ShareIos } from 'iconoir-react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { GameStatus } from '@/types';
import { MOCK_GAMES, MOCK_POSITIONS, MOCK_CURRENT_ADDRESS } from '@/lib/mock-data';
import { AnimatedText } from '@/components/AnimatedText';
import { TokenIcon } from '@/components/TokenIcon';
import { CountdownTimer } from '@/components/CountdownTimer';
import { TradeDrawer } from '@/components/TradeDrawer';
import { haptic } from '@/lib/haptics';
import { Page } from '@/components/PageLayout';

export default function GameViewPage() {
  const params = useParams();
  const router = useRouter();
  const [tradeOpen, setTradeOpen] = useState(false);

  const game = MOCK_GAMES.find((g) => g.id === params.id);
  if (!game) {
    return (
      <Page.Main>
        <p className="py-12 text-center" style={{ color: '#9898aa' }}>Game not found</p>
      </Page.Main>
    );
  }

  const currentPlayer = game.players.find((p) => p.address === MOCK_CURRENT_ADDRESS);
  const positions = MOCK_POSITIONS[game.id] || [];
  const isActive = game.status === GameStatus.Active;
  const pnl = currentPlayer?.pnlPercent ?? 0;

  return (
    <>
      <Page.Header>
        <TopBar
          startAdornment={
            <button
              onClick={() => router.back()}
              className="flex h-10 w-10 items-center justify-center rounded-full active:scale-90 transition-transform"
              style={{ backgroundColor: '#24242e' }}
            >
              <NavArrowLeft width={20} height={20} style={{ color: '#9898aa' }} />
            </button>
          }
          title={game.name}
          endAdornment={
            <button
              onClick={() => {
                haptic.light();
                navigator.share?.({
                  title: `Join ${game.name} on World In Paper`,
                  text: `Paper trading game — ${game.entryAmount} USDC buy-in, ${game.playerCount}/${game.maxPlayers} players`,
                  url: `https://worldcoin.org/mini-app?app_id=${process.env.NEXT_PUBLIC_APP_ID}&path=/my-games/${game.id}`,
                }).catch(() => {});
              }}
              className="flex h-9 w-9 items-center justify-center rounded-full active:scale-90 transition-transform"
              style={{ backgroundColor: '#24242e' }}
            >
              <ShareIos width={16} height={16} style={{ color: '#9898aa' }} />
            </button>
          }
        />
      </Page.Header>

      <Page.Main>
        {/* Balance + P&L */}
        <div className="mb-6 text-center">
          <div className="text-sm font-semibold uppercase tracking-wider mb-2" style={{ color: '#6a6a7a' }}>Your Balance</div>
          <div className="flex items-center justify-center gap-2">
            <AnimatedText
              className="text-4xl font-extrabold"
              style={{ color: '#ffffff' }}
            >
              {`$${currentPlayer?.portfolioValue.toLocaleString() ?? game.startingCapital.toLocaleString()}`}
            </AnimatedText>
          </div>
          <AnimatedText
            className="text-lg font-bold mt-1"
            style={{ color: pnl >= 0 ? '#34c759' : '#ff6b6b' }}
          >
            {`${pnl >= 0 ? '+' : ''}${pnl.toFixed(1)}%`}
          </AnimatedText>
        </div>

        {/* Stats row */}
        <div className="flex gap-2 mb-6">
          <div className="flex-1 rounded-2xl p-3 text-center" style={{ backgroundColor: '#1c1c24' }}>
            <div className="text-xs" style={{ color: '#6a6a7a' }}>Buy-in</div>
            <div className="flex items-center justify-center gap-1">
              <span className="text-lg font-extrabold" style={{ color: '#ffffff' }}>{game.entryAmount}</span>
              <Image src="/usd-coin-usdc-logo.svg" alt="USDC" width={16} height={16} />
            </div>
          </div>
          <div className="flex-1 rounded-2xl p-3 text-center" style={{ backgroundColor: '#1c1c24' }}>
            <div className="text-xs" style={{ color: '#6a6a7a' }}>Start with</div>
            <div className="text-lg font-extrabold" style={{ color: '#ffffff' }}>${game.startingCapital.toLocaleString()}</div>
          </div>
          <div className="flex-1 rounded-2xl p-3 text-center" style={{ backgroundColor: '#1c1c24' }}>
            <div className="text-xs" style={{ color: '#6a6a7a' }}>Players</div>
            <div className="text-lg font-extrabold" style={{ color: '#ffffff' }}>{game.playerCount}</div>
          </div>
        </div>

        {isActive && (
          <div className="flex justify-center mb-6">
            <CountdownTimer targetTime={game.endTime} label="Ends in" />
          </div>
        )}
        {game.status === GameStatus.Upcoming && (
          <div className="flex justify-center mb-6">
            <CountdownTimer targetTime={game.startTime} label="Starts in" />
          </div>
        )}

        {/* Positions */}
        <div className="mb-8">
          <div className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: '#6a6a7a' }}>
            Positions
          </div>
          {positions.length > 0 ? (
            <div className="space-y-2">
              {positions.map((pos) => {
                const isPosPositive = pos.pnl >= 0;
                return (
                  <div
                    key={pos.id}
                    className="flex items-center justify-between rounded-2xl p-4"
                    style={{ backgroundColor: '#1c1c24' }}
                  >
                    <div className="flex items-center gap-3">
                      <TokenIcon src={pos.asset.iconUrl} alt={pos.asset.symbol} />
                      <div>
                        <div className="text-[15px] font-bold" style={{ color: '#ffffff' }}>
                          {pos.asset.symbol}
                        </div>
                        <div className="text-xs" style={{ color: '#9898aa' }}>
                          {pos.quantity} @ ${pos.entryPrice.toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[15px] font-bold" style={{ color: '#ffffff' }}>
                        ${pos.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div
                        className="text-xs font-semibold"
                        style={{ color: isPosPositive ? '#34c759' : '#ff6b6b' }}
                      >
                        {isPosPositive ? '+' : ''}{pos.pnlPercent.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-8 text-center">
              <p className="text-sm" style={{ color: '#9898aa' }}>No positions yet</p>
            </div>
          )}
        </div>

        {/* Leaderboard */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold uppercase tracking-wider" style={{ color: '#6a6a7a' }}>
              Leaderboard
            </span>
            {currentPlayer && (
              <span className="text-sm font-bold" style={{ color: '#ffffff' }}>
                Your rank: #{currentPlayer.rank}/{game.playerCount}
              </span>
            )}
          </div>
          {[...game.players]
            .sort((a, b) => a.rank - b.rank)
            .map((player) => {
              const isCurrent = player.address === MOCK_CURRENT_ADDRESS;
              const playerPnl = player.pnlPercent;
              return (
                <div
                  key={player.address}
                  className="flex items-center justify-between"
                  style={{
                    padding: '14px 0',
                    borderBottom: '1px solid #24242e',
                    fontWeight: isCurrent ? 700 : 400,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="w-5 text-sm text-center font-bold"
                      style={{
                        color: (() => {
                          const half = Math.floor(game.playerCount / 2);
                          const isOdd = game.playerCount % 2 !== 0;
                          const middleRank = half + 1;
                          if (player.rank <= half) return '#34c759';
                          if (isOdd && player.rank === middleRank) return '#6a6a7a';
                          return '#ff6b6b';
                        })(),
                      }}
                    >
                      {player.rank}
                    </span>
                    <div>
                      <div className="text-[15px]" style={{ color: '#ffffff' }}>
                        {player.username}
                        {isCurrent && <span className="text-xs ml-1" style={{ color: '#6a6a7a' }}>(you)</span>}
                      </div>
                      <div className="text-xs" style={{ color: '#9898aa' }}>
                        ${player.portfolioValue.toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className="text-[15px] font-bold"
                      style={{ color: playerPnl >= 0 ? '#34c759' : '#ff6b6b' }}
                    >
                      {playerPnl >= 0 ? '+' : ''}{playerPnl.toFixed(1)}%
                    </div>
                    <div className="text-xs" style={{ color: '#9898aa' }}>
                      ${Math.abs(player.pnl).toLocaleString()}
                    </div>
                  </div>
                </div>
              );
            })}
        </div>

        {/* Trade FAB */}
        {isActive && (
          <div className="fixed bottom-28 right-5 z-10">
            <button
              onClick={() => { setTradeOpen(true); haptic.light(); }}
              className="flex items-center gap-2 rounded-full px-6 shadow-lg active:scale-90 transition-transform"
              style={{ backgroundColor: '#2470ff', color: '#ffffff', height: '56px' }}
            >
              <Plus width={20} height={20} strokeWidth={2.5} />
              <span className="text-[15px] font-bold">Trade</span>
            </button>
          </div>
        )}
      </Page.Main>

      <TradeDrawer
        isOpen={tradeOpen}
        onClose={() => setTradeOpen(false)}
        availableBalance={currentPlayer?.portfolioValue ?? game.startingCapital}
        positions={positions.map((p) => ({ symbol: p.asset.symbol, quantity: p.quantity }))}
      />
    </>
  );
}
