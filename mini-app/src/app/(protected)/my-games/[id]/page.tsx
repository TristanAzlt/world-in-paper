'use client';

import { TopBar } from '@worldcoin/mini-apps-ui-kit-react';
import { NavArrowLeft, Plus, ShareIos, Trophy, Lock } from 'iconoir-react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { useState, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { getGameStatus, GameStatus, formatWipBalance } from '@/types';
import { useExploreGames, useMyGames } from '@/hooks/useGames';
import { useGameRanking, usePlayerPortfolio } from '@/hooks/useGame';
import { AnimatedText } from '@/components/AnimatedText';
import { CountdownTimer } from '@/components/CountdownTimer';
import { LoadingSpinner } from '@/components/LoadingState';
import { TradeDrawer } from '@/components/TradeDrawer';
import { TokenIcon } from '@/components/TokenIcon';
import { useContract } from '@/hooks/useContract';
import { useTokenPrices } from '@/hooks/useTokenPrices';
import { haptic } from '@/lib/haptics';
import { Page } from '@/components/PageLayout';

function shortenAddress(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function formatQty(n: number): string {
  if (n === 0) return '0';
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(2)}K`;
  if (n >= 1) return n.toFixed(4);
  if (n >= 0.0001) return n.toFixed(6);
  return n.toPrecision(4);
}

export default function GameViewPage() {
  const params = useParams();
  const router = useRouter();
  const session = useSession();
  const walletAddress = session?.data?.user?.walletAddress;
  const gameId = params.id as string;

  const { games: myGames } = useMyGames(walletAddress);
  const { games: allGames } = useExploreGames();
  const { ranking, loading: rankingLoading, refetch: refreshRanking } = useGameRanking(gameId);
  const { portfolio, loading: portfolioLoading, refetch: refreshPortfolio } = usePlayerPortfolio(gameId, walletAddress);

  // Pull to refresh
  const [refreshing, setRefreshing] = useState(false);
  const touchStart = useRef(0);
  const pullDistance = useRef(0);
  const [pullY, setPullY] = useState(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      touchStart.current = e.touches[0].clientY;
    } else {
      touchStart.current = 0;
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const diff = e.touches[0].clientY - touchStart.current;
    if (diff > 0) {
      pullDistance.current = Math.min(diff, 120);
      setPullY(pullDistance.current);
    }
  }, []);

  const handleTouchEnd = useCallback(async () => {
    if (pullDistance.current > 60) {
      setRefreshing(true);
      haptic.light();
      await Promise.all([refreshPortfolio(), refreshRanking()]);
      setRefreshing(false);
    }
    touchStart.current = 0;
    pullDistance.current = 0;
    setPullY(0);
  }, [refreshPortfolio, refreshRanking]);

  const { claimGame } = useContract();
  const tokenPrices = useTokenPrices(portfolio?.tokens ?? []);
  const [tradeOpen, setTradeOpen] = useState(false);
  const [preselectedAsset, setPreselectedAsset] = useState<{ address: string; origin: string } | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);

  const game = [...myGames, ...allGames].find((g) => g.id === gameId);

  if (!game) {
    return (
      <Page.Main className="flex items-center justify-center" style={{ minHeight: '70vh' }}>
        <LoadingSpinner label="Loading game..." />
      </Page.Main>
    );
  }

  const status = getGameStatus(game);
  const isActive = status === GameStatus.Active;
  const isEnded = status === GameStatus.Ended;
  const isUpcoming = status === GameStatus.Upcoming;
  const startingWip = formatWipBalance(game.startingWIPBalance);
  const cashBalance = portfolio ? formatWipBalance(portfolio.wipBalance) : startingWip;
  const positionsValue = portfolio
    ? portfolio.tokens.reduce((sum, t) => {
        const info = tokenPrices[t.asset_address.toLowerCase()];
        const decimals = info?.decimals ?? 6;
        const bal = Number(t.balance) / 10 ** decimals;
        return sum + (info ? bal * info.price : 0);
      }, 0)
    : 0;
  const hasTokens = portfolio && portfolio.tokens.length > 0;
  const pricesReady = !hasTokens || Object.keys(tokenPrices).length > 0;
  const currentWip = cashBalance + positionsValue;
  const pnl = startingWip > 0 ? ((currentWip - startingWip) / startingWip) * 100 : 0;
  const myRank = ranking.find((r) => r.player.toLowerCase() === walletAddress?.toLowerCase());
  const claimableAmount = portfolio ? formatWipBalance(portfolio.claimableAmount) : 0;
  const alreadyClaimed = portfolio?.claimed || claimed;
  const handleClaim = async () => {
    haptic.medium();
    setClaiming(true);
    try {
      const result = await claimGame(BigInt(gameId));
      if (result?.data?.userOpHash) {
        haptic.success();
        setClaimed(true);
      } else {
        throw new Error('Claim failed');
      }
    } catch (e) {
      console.error('Claim failed:', e);
      haptic.error();
    } finally {
      setClaiming(false);
    }
  };

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
          title={game.name || `Game #${gameId}`}
          endAdornment={
            <button
              onClick={() => {
                haptic.light();
                navigator.share?.({
                  title: `Join ${game.name || `Game #${gameId}`} on World In Paper`,
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

      <Page.Main
        className="animate-fade-in"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Pull to refresh indicator */}
        <div
          className="flex justify-center overflow-hidden transition-all duration-200"
          style={{ height: pullY > 0 || refreshing ? `${Math.max(pullY, refreshing ? 40 : 0)}px` : '0px', opacity: pullY > 20 || refreshing ? 1 : 0 }}
        >
          <div
            className={`h-5 w-5 rounded-full border-2 ${refreshing ? 'animate-spin' : ''}`}
            style={{ borderColor: '#2470ff', borderTopColor: 'transparent', marginTop: '12px' }}
          />
        </div>

        {/* Status banner */}
        {isUpcoming && (
          <div className="rounded-2xl px-4 py-3 mb-4 flex items-center gap-3" style={{ backgroundColor: '#f59e0b15', border: '1px solid #f59e0b30' }}>
            <Lock width={18} height={18} style={{ color: '#f59e0b' }} />
            <span className="text-sm font-semibold" style={{ color: '#f59e0b' }}>
              Game hasn&apos;t started yet — trading opens soon
            </span>
          </div>
        )}

        {isEnded && !alreadyClaimed && claimableAmount > 0 && (
          <div className="rounded-2xl px-5 py-4 mb-4 text-center" style={{ backgroundColor: '#34c75915', border: '1px solid #34c75930' }}>
            <div className="flex items-center justify-center gap-2 mb-2">
              <Trophy width={20} height={20} style={{ color: '#34c759' }} />
              <span className="text-base font-bold" style={{ color: '#34c759' }}>Game ended — You can claim!</span>
            </div>
            <div className="flex items-center justify-center gap-2 mb-3">
              <Image src="/usd-coin-usdc-logo.svg" alt="USDC" width={24} height={24} />
              <span className="text-2xl font-extrabold" style={{ color: '#ffffff' }}>{claimableAmount}</span>
              <span className="text-base font-bold" style={{ color: '#9898aa' }}>USDC</span>
            </div>
            <button
              onClick={handleClaim}
              disabled={claiming}
              className="w-full rounded-2xl text-base font-bold active:scale-[0.97] transition-all disabled:opacity-50"
              style={{ height: '52px', backgroundColor: '#34c759', color: '#ffffff' }}
            >
              {claiming ? 'Claiming...' : 'Claim Reward'}
            </button>
          </div>
        )}

        {isEnded && alreadyClaimed && (
          <div className="rounded-2xl px-4 py-3 mb-4 flex items-center gap-3" style={{ backgroundColor: '#1c1c24' }}>
            <Trophy width={18} height={18} style={{ color: '#6a6a7a' }} />
            <span className="text-sm font-semibold" style={{ color: '#6a6a7a' }}>
              Reward claimed ({claimableAmount} USDC)
            </span>
          </div>
        )}

        {isEnded && claimableAmount === 0 && (
          <div className="rounded-2xl px-4 py-3 mb-4 flex items-center gap-3" style={{ backgroundColor: '#1c1c24' }}>
            <span className="text-sm" style={{ color: '#6a6a7a' }}>Game ended — no reward to claim</span>
          </div>
        )}

        {/* Balance + P&L */}
        <div className="mb-6 text-center">
          <div className="text-sm font-semibold uppercase tracking-wider mb-2" style={{ color: '#6a6a7a' }}>
            {isEnded ? 'Final Balance' : 'Your Balance'}
          </div>
          {portfolioLoading || !pricesReady ? (
            <>
              <div className="h-10 w-40 mx-auto rounded-xl animate-pulse mb-2" style={{ backgroundColor: '#1c1c24' }} />
              <div className="h-6 w-20 mx-auto rounded-lg animate-pulse" style={{ backgroundColor: '#1c1c24' }} />
            </>
          ) : (
            <>
              <AnimatedText className="text-4xl font-extrabold" style={{ color: '#ffffff' }}>
                {`$${currentWip.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              </AnimatedText>
              <AnimatedText className="text-lg font-bold mt-1" style={{ color: pnl >= 0 ? '#34c759' : '#ff6b6b' }}>
                {`${pnl >= 0 ? '+' : ''}${pnl.toFixed(1)}%`}
              </AnimatedText>
            </>
          )}
          {isActive && (
            <div className="mt-2 flex justify-center">
              <CountdownTimer targetTime={Number(game.endTime) * 1000} label="Ends in" />
            </div>
          )}
          {isUpcoming && (
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
          {portfolioLoading || (hasTokens && !pricesReady) ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="flex items-center gap-3 rounded-2xl p-4" style={{ backgroundColor: '#1c1c24' }}>
                  <div className="h-10 w-10 rounded-full animate-pulse" style={{ backgroundColor: '#24242e' }} />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-16 rounded animate-pulse" style={{ backgroundColor: '#24242e' }} />
                    <div className="h-3 w-24 rounded animate-pulse" style={{ backgroundColor: '#24242e' }} />
                  </div>
                  <div className="h-4 w-16 rounded animate-pulse" style={{ backgroundColor: '#24242e' }} />
                </div>
              ))}
            </div>
          ) : portfolio && portfolio.tokens.filter((t) => {
                const d = tokenPrices[t.asset_address.toLowerCase()]?.decimals ?? 6;
                return Number(t.balance) / 10 ** d > 0.0001;
              }).length > 0 ? (
            <div className="space-y-2">
              {portfolio.tokens.filter((t) => {
                const d = tokenPrices[t.asset_address.toLowerCase()]?.decimals ?? 6;
                return Number(t.balance) / 10 ** d > 0.0001;
              }).map((token) => {
                const info = tokenPrices[token.asset_address.toLowerCase()];
                const decimals = info?.decimals ?? 6;
                const bal = Number(token.balance) / 10 ** decimals;
                const value = info ? bal * info.price : 0;
                const totalBought = token.trades
                  .filter((t) => t.isBuy)
                  .reduce((sum, t) => sum + formatWipBalance(t.amountIn), 0);
                const totalSold = token.trades
                  .filter((t) => !t.isBuy)
                  .reduce((sum, t) => sum + formatWipBalance(t.amountOut), 0);
                const tokenPnl = value + totalSold - totalBought;

                return (
                  <button
                    key={`${token.asset_address}-${token.origin}`}
                    onClick={() => {
                      if (!isActive) return;
                      setPreselectedAsset({ address: token.asset_address, origin: token.origin });
                      setTradeOpen(true);
                      haptic.light();
                    }}
                    className="flex w-full items-center justify-between rounded-2xl p-4 text-left active:scale-[0.98] transition-all"
                    style={{ backgroundColor: '#1c1c24' }}
                  >
                    <div className="flex items-center gap-3">
                      <TokenIcon src={info?.image || ''} alt={info?.symbol || token.asset_address} />
                      <div>
                        <div className="text-[15px] font-bold" style={{ color: '#ffffff' }}>
                          {info?.symbol || token.asset_address}
                        </div>
                        <div className="text-xs" style={{ color: '#9898aa' }}>
                          {formatQty(bal)} {info?.symbol || ''}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[15px] font-bold" style={{ color: '#ffffff' }}>
                        ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      {totalBought > 0 && (
                        <div className="text-xs" style={{ color: tokenPnl >= 0 ? '#34c759' : '#ff6b6b' }}>
                          {tokenPnl >= 0 ? '+' : '-'}${Math.abs(tokenPnl).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
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
                Your rank: {myRank.place}/{game.playerCount}
              </span>
            )}
          </div>
          {rankingLoading ? (
            <div className="py-4 text-center text-sm" style={{ color: '#6a6a7a' }}>Loading...</div>
          ) : (
            ranking.map((player) => {
              const isCurrent = player.player.toLowerCase() === walletAddress?.toLowerCase();
              // For current user, use total portfolio value (cash + positions)
              const playerWip = isCurrent && pricesReady ? currentWip : formatWipBalance(player.wipBalance);
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
                    <div className="text-xs" style={{ color: playerPnl >= 0 ? '#34c759' : '#ff6b6b' }}>
                      {playerPnl >= 0 ? '+' : '-'}${Math.abs(playerWip - startingWip).toLocaleString()}
                    </div>
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
        onClose={() => { setTradeOpen(false); setPreselectedAsset(null); }}
        availableBalance={cashBalance}
        gameId={gameId}
        preselectedAsset={preselectedAsset}
        walletAddress={walletAddress}
        positions={portfolio?.tokens.map((t) => {
          const d = tokenPrices[t.asset_address.toLowerCase()]?.decimals ?? 6;
          return { symbol: t.asset_address, quantity: Number(t.balance) / 10 ** d };
        }) ?? []}
        onTradeSuccess={refreshPortfolio}
      />
    </>
  );
}
