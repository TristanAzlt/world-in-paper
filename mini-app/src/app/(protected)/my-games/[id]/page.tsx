'use client';

import { TopBar } from '@worldcoin/mini-apps-ui-kit-react';
import { NavArrowLeft, Plus, ShareIos } from 'iconoir-react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { getGameStatus, GameStatus, formatWipBalance } from '@/types';
import { useExploreGames, useMyGames } from '@/hooks/useGames';
import { useGameRanking, usePlayerPortfolio } from '@/hooks/useGame';
import { AnimatedText } from '@/components/AnimatedText';
import { CountdownTimer } from '@/components/CountdownTimer';
import { LoadingSpinner } from '@/components/LoadingState';
import { TradeDrawer } from '@/components/TradeDrawer';
import { TokenIcon } from '@/components/TokenIcon';
import { haptic } from '@/lib/haptics';
import { Page } from '@/components/PageLayout';

function shortenAddress(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default function GameViewPage() {
  const params = useParams();
  const router = useRouter();
  const session = useSession();
  const walletAddress = session?.data?.user?.walletAddress;
  const gameId = params.id as string;

  const { games: myGames } = useMyGames(walletAddress);
  const { games: allGames } = useExploreGames();
  const { ranking, loading: rankingLoading } = useGameRanking(gameId);
  const { portfolio, loading: portfolioLoading } = usePlayerPortfolio(gameId, walletAddress);

  const [tradeOpen, setTradeOpen] = useState(false);

  const game = [...myGames, ...allGames].find((g) => g.id === gameId);

  if (!game) {
    return (
      <Page.Main>
        <LoadingSpinner label="Loading game..." />
      </Page.Main>
    );
  }

  const status = getGameStatus(game);
  const isActive = status === GameStatus.Active;
  const startingWip = formatWipBalance(game.startingWIPBalance);
  const currentWip = portfolio ? formatWipBalance(portfolio.wipBalance) : startingWip;
  const pnl = startingWip > 0 ? ((currentWip - startingWip) / startingWip) * 100 : 0;
  const myRank = ranking.find((r) => r.player.toLowerCase() === walletAddress?.toLowerCase());

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
          title={`Game #${gameId}`}
          endAdornment={
            <button
              onClick={() => {
                haptic.light();
                navigator.share?.({
                  title: `Join Game #${gameId} on World In Paper`,
                  text: `Paper trading game — ${formatWipBalance(game.entryAmount)} USDC buy-in`,
                  url: `https://worldcoin.org/mini-app?app_id=${process.env.NEXT_PUBLIC_APP_ID}&path=/my-games/${gameId}`,
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
          <AnimatedText className="text-4xl font-extrabold" style={{ color: '#ffffff' }}>
            {`$${currentWip.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          </AnimatedText>
          <AnimatedText className="text-lg font-bold mt-1" style={{ color: pnl >= 0 ? '#34c759' : '#ff6b6b' }}>
            {`${pnl >= 0 ? '+' : ''}${pnl.toFixed(1)}%`}
          </AnimatedText>
          {isActive && (
            <div className="mt-2 flex justify-center">
              <CountdownTimer targetTime={Number(game.endTime) * 1000} label="Ends in" />
            </div>
          )}
          {status === GameStatus.Upcoming && (
            <div className="mt-2 flex justify-center">
              <CountdownTimer targetTime={Number(game.startTime) * 1000} label="Starts in" />
            </div>
          )}
        </div>

        {/* Stats row */}
        <div className="flex gap-2 mb-6">
          <div className="flex-1 rounded-2xl p-3 text-center" style={{ backgroundColor: '#1c1c24' }}>
            <div className="text-xs" style={{ color: '#6a6a7a' }}>Buy-in</div>
            <div className="flex items-center justify-center gap-1">
              <span className="text-lg font-extrabold" style={{ color: '#ffffff' }}>{formatWipBalance(game.entryAmount)}</span>
              <Image src="/usd-coin-usdc-logo.svg" alt="USDC" width={16} height={16} />
            </div>
          </div>
          <div className="flex-1 rounded-2xl p-3 text-center" style={{ backgroundColor: '#1c1c24' }}>
            <div className="text-xs" style={{ color: '#6a6a7a' }}>Start with</div>
            <div className="text-lg font-extrabold" style={{ color: '#ffffff' }}>${startingWip.toLocaleString()}</div>
          </div>
          <div className="flex-1 rounded-2xl p-3 text-center" style={{ backgroundColor: '#1c1c24' }}>
            <div className="text-xs" style={{ color: '#6a6a7a' }}>Players</div>
            <div className="text-lg font-extrabold" style={{ color: '#ffffff' }}>{game.playerCount}</div>
          </div>
        </div>

        {/* Positions */}
        <div className="mb-8">
          <div className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: '#6a6a7a' }}>Positions</div>
          {portfolioLoading ? (
            <div className="py-4 text-center text-sm" style={{ color: '#6a6a7a' }}>Loading...</div>
          ) : portfolio && portfolio.tokens.length > 0 ? (
            <div className="space-y-2">
              {portfolio.tokens.map((token) => (
                <div
                  key={`${token.asset_address}-${token.origin}`}
                  className="flex items-center justify-between rounded-2xl p-4"
                  style={{ backgroundColor: '#1c1c24' }}
                >
                  <div className="flex items-center gap-3">
                    <TokenIcon src="" alt={token.asset_address} />
                    <div>
                      <div className="text-[15px] font-bold" style={{ color: '#ffffff' }}>{token.asset_address}</div>
                      <div className="text-xs" style={{ color: '#9898aa' }}>
                        Balance: {formatWipBalance(token.balance).toFixed(4)}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs" style={{ color: '#6a6a7a' }}>
                    {token.trades.length} trade{token.trades.length > 1 ? 's' : ''}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center">
              <p className="text-sm" style={{ color: '#6a6a7a' }}>No positions yet</p>
            </div>
          )}
        </div>

        {/* Leaderboard */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold uppercase tracking-wider" style={{ color: '#6a6a7a' }}>Leaderboard</span>
            {myRank && (
              <span className="text-sm font-bold" style={{ color: '#ffffff' }}>
                Your rank: #{myRank.place}/{game.playerCount}
              </span>
            )}
          </div>
          {rankingLoading ? (
            <div className="py-4 text-center text-sm" style={{ color: '#6a6a7a' }}>Loading...</div>
          ) : (
            ranking.map((player) => {
              const isCurrent = player.player.toLowerCase() === walletAddress?.toLowerCase();
              const playerWip = formatWipBalance(player.wipBalance);
              const playerPnl = startingWip > 0 ? ((playerWip - startingWip) / startingWip) * 100 : 0;
              const half = Math.floor(Number(game.playerCount) / 2);
              const isOdd = Number(game.playerCount) % 2 !== 0;
              const rank = Number(player.place);
              const rankColor = rank <= half ? '#34c759' : (isOdd && rank === half + 1) ? '#6a6a7a' : '#ff6b6b';

              return (
                <div
                  key={player.player}
                  className="flex items-center justify-between"
                  style={{ padding: '14px 0', borderBottom: '1px solid #24242e', fontWeight: isCurrent ? 700 : 400 }}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-5 text-sm text-center font-bold" style={{ color: rankColor }}>{player.place}</span>
                    <div>
                      <div className="text-[15px]" style={{ color: '#ffffff' }}>
                        {isCurrent ? (session?.data?.user?.username || shortenAddress(player.player)) : shortenAddress(player.player)}
                        {isCurrent && <span className="text-xs ml-1" style={{ color: '#6a6a7a' }}>(you)</span>}
                      </div>
                      <div className="text-xs" style={{ color: '#9898aa' }}>${playerWip.toLocaleString()}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[15px] font-bold" style={{ color: playerPnl >= 0 ? '#34c759' : '#ff6b6b' }}>
                      {playerPnl >= 0 ? '+' : ''}{playerPnl.toFixed(1)}%
                    </div>
                    <div className="text-xs" style={{ color: '#9898aa' }}>${Math.abs(playerWip - startingWip).toLocaleString()}</div>
                  </div>
                </div>
              );
            })
          )}
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
        availableBalance={currentWip}
        gameId={gameId}
      />
    </>
  );
}
