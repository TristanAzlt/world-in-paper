'use client';

import { Chip } from '@worldcoin/mini-apps-ui-kit-react';
import clsx from 'clsx';
import { DollarCircle, Group } from 'iconoir-react';
import type { Game, GameStatus } from '@/types';
import { CountdownTimer } from '@/components/CountdownTimer';

interface GameCardProps {
  game: Game;
  userPnlPercent?: number;
  userRank?: number;
  onClick?: () => void;
}

const STATUS_CONFIG: Record<GameStatus, { label: string; variant: 'default' | 'success' | 'warning' }> = {
  upcoming: { label: 'Upcoming', variant: 'default' },
  active: { label: 'Live', variant: 'success' },
  ended: { label: 'Ended', variant: 'warning' },
};

export function GameCard({ game, userPnlPercent, userRank, onClick }: GameCardProps) {
  const statusConfig = STATUS_CONFIG[game.status];
  const isActive = game.status === 'active';
  const isEnded = game.status === 'ended';

  return (
    <button
      onClick={onClick}
      className="w-full rounded-2xl border border-[#2e2e3a] bg-[#1c1c24] p-4 text-left shadow-sm transition-all duration-150 active:scale-[0.98] active:bg-[#24242e]"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-[15px] font-semibold text-white">{game.name}</span>
        <Chip label={statusConfig.label} variant={statusConfig.variant} />
      </div>

      {/* Meta */}
      <div className="mt-2.5 flex items-center gap-4 text-[13px] text-[#9898aa]">
        <span className="flex items-center gap-1">
          <DollarCircle width={14} height={14} strokeWidth={1.8} />
          {game.entryAmount} USDC
        </span>
        <span className="flex items-center gap-1">
          <Group width={14} height={14} strokeWidth={1.8} />
          {game.playerCount}/{game.maxPlayers}
        </span>
        <span className="text-[#2e2e3a]">|</span>
        <span>${game.startingCapital.toLocaleString()} capital</span>
      </div>

      {/* User P&L */}
      {userPnlPercent !== undefined && userRank !== undefined && (
        <div className="mt-2.5 flex items-center justify-between rounded-lg bg-[#24242e] px-3 py-2 text-sm">
          <span
            className={clsx(
              'font-semibold',
              userPnlPercent >= 0 ? 'text-[#34c759]' : 'text-[#ff6b6b]',
            )}
          >
            {userPnlPercent >= 0 ? '+' : ''}{userPnlPercent.toFixed(1)}%
          </span>
          <span className="text-[#9898aa]">Rank #{userRank}</span>
        </div>
      )}

      {/* Timer */}
      <div className="mt-2.5">
        {isActive && <CountdownTimer targetTime={game.endTime} label="Ends in" />}
        {!isActive && !isEnded && <CountdownTimer targetTime={game.startTime} label="Starts in" />}
        {isEnded && <span className="text-[13px] text-[#6a6a7a]">Finished</span>}
      </div>
    </button>
  );
}
