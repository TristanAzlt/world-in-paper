import { ListItem, Marble } from '@worldcoin/mini-apps-ui-kit-react';
import clsx from 'clsx';
import type { Player } from '@/types';

interface LeaderboardRowProps {
  player: Player;
  isCurrentUser?: boolean;
}

export function LeaderboardRow({ player, isCurrentUser }: LeaderboardRowProps) {
  const isPositive = player.pnlPercent >= 0;

  return (
    <div className={clsx(isCurrentUser && 'rounded-xl bg-blue-50/40')}>
    <ListItem
      label={player.username}
      description={`$${player.portfolioValue.toLocaleString()}`}
      startAdornment={
        <div className="flex items-center gap-2">
          <span
            className={clsx(
              'flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold',
              player.rank === 1 && 'bg-yellow-100 text-yellow-700',
              player.rank === 2 && 'bg-gray-100 text-gray-600',
              player.rank === 3 && 'bg-orange-100 text-orange-700',
              player.rank > 3 && 'bg-gray-50 text-gray-400',
            )}
          >
            {player.rank}
          </span>
          <Marble
            src={player.profilePictureUrl || ''}
            alt={player.username}
            className="h-7 w-7"
          />
        </div>
      }
      endAdornment={
        <span
          className={clsx(
            'text-sm font-medium',
            isPositive ? 'text-green-600' : 'text-red-600',
          )}
        >
          {isPositive ? '+' : ''}{player.pnlPercent.toFixed(1)}%
        </span>
      }
    />
    </div>
  );
}
