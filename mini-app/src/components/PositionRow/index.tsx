import { ListItem } from '@worldcoin/mini-apps-ui-kit-react';
import type { Position } from '@/types';

interface PositionRowProps {
  position: Position;
}

export function PositionRow({ position }: PositionRowProps) {
  const isPositive = position.pnl >= 0;
  return (
    <ListItem
      label={position.asset.symbol}
      description={`${position.quantity} @ $${position.entryPrice.toLocaleString()}`}
      startAdornment={
        <img
          src={position.asset.iconUrl}
          alt={position.asset.symbol}
          className="h-8 w-8 rounded-full bg-[#24242e]"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      }
      endAdornment={
        <div className="text-right">
          <div className="text-sm font-medium text-white">
            ${position.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className={`text-xs ${isPositive ? 'text-[#34c759]' : 'text-[#ff6b6b]'}`}>
            {isPositive ? '+' : ''}{position.pnlPercent.toFixed(1)}%
          </div>
        </div>
      }
    />
  );
}
