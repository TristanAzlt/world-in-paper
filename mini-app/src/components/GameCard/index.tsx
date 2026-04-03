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
      className="w-full rounded-2xl border border-gray-200 bg-white p-4 text-left shadow-sm transition-all duration-150 active:scale-[0.98] active:bg-gray-50"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-[15px] font-semibold text-gray-900">{game.name}</span>
        <Chip label={statusConfig.label} variant={statusConfig.variant} />
      </div>

      {/* Meta */}
      <div className="mt-2.5 flex items-center gap-4 text-[13px] text-gray-500">
        <span className="flex items-center gap-1">
          <DollarCircle width={14} height={14} strokeWidth={1.8} />
          {game.entryAmount} USDC
        </span>
        <span className="flex items-center gap-1">
          <Group width={14} height={14} strokeWidth={1.8} />
          {game.playerCount}/{game.maxPlayers}
        </span>
        <span className="text-gray-300">|</span>
        <span>${game.startingCapital.toLocaleString()} capital</span>
      </div>

      {/* User P&L */}
      {userPnlPercent !== undefined && userRank !== undefined && (
        <div className="mt-2.5 flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm">
          <span
            className={clsx(
              'font-semibold',
              userPnlPercent >= 0 ? 'text-green-600' : 'text-red-500',
            )}
          >
            {userPnlPercent >= 0 ? '+' : ''}{userPnlPercent.toFixed(1)}%
          </span>
          <span className="text-gray-500">Rank #{userRank}</span>
        </div>
      )}

      {/* Timer */}
      <div className="mt-2.5">
        {isActive && <CountdownTimer targetTime={game.endTime} label="Ends in" />}
        {!isActive && !isEnded && <CountdownTimer targetTime={game.startTime} label="Starts in" />}
        {isEnded && <span className="text-[13px] text-gray-400">Finished</span>}
      </div>
    </button>
  );
}
